import { ForbiddenException } from '@nestjs/common';
import type { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { FilesService } from './files.service';
import { scheduleFileRecycle } from './file-retention';

describe('file retention safety', () => {
  const user = { userId: 'owner', roles: [] } as unknown as CurrentUser;
  let file: { id: string; uploadedBy: string | null; orphanedAt: Date | null; ossKey: string };
  const manager = { findOne: jest.fn(), query: jest.fn(), save: jest.fn(), update: jest.fn(), delete: jest.fn(), insert: jest.fn() };
  const repository = { find: jest.fn() };
  const oss = { deleteObject: jest.fn() };
  const dataSource = { transaction: jest.fn(), getRepository: jest.fn() };
  const service = new FilesService(repository as never, oss as never, {} as never, {} as never, dataSource as never);

  beforeEach(() => {
    jest.resetAllMocks();
    file = { id: 'file-1', uploadedBy: 'owner', orphanedAt: null, ossKey: 'certificates/test.pdf' };
    manager.findOne.mockResolvedValue(file);
    manager.query.mockResolvedValue([{ referenced: false }]);
    dataSource.transaction.mockImplementation(async (work: (m: typeof manager) => Promise<void>) => work(manager));
    repository.find.mockResolvedValue([file]);
    dataSource.getRepository.mockReturnValue({ find: jest.fn().mockResolvedValue([]) });
  });

  it('only schedules an unreferenced file and preserves the initial deadline on retry', async () => {
    await service.deleteIfOrphaned(file.id, user);
    const startedAt = file.orphanedAt;
    expect(startedAt).toBeInstanceOf(Date);
    await service.deleteIfOrphaned(file.id, user);
    expect(file.orphanedAt).toBe(startedAt);
    expect(oss.deleteObject).not.toHaveBeenCalled();
  });

  it.each(['someone-else', null])('does not allow a business manager to recycle a file owned by %s', async (owner) => {
    file.uploadedBy = owner;
    await expect(service.deleteIfOrphaned(file.id, { ...user, roles: ['finance'] })).rejects.toBeInstanceOf(ForbiddenException);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('refuses a referenced file without marking it', async () => {
    manager.query.mockResolvedValue([{ referenced: true }]);
    await expect(service.deleteIfOrphaned(file.id, user)).rejects.toThrow('引用');
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('fails closed if the reference result is invalid', async () => {
    manager.query.mockResolvedValue([]);
    await expect(service.deleteIfOrphaned(file.id, user)).rejects.toThrow('reference check');
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('does not clean a file before the full retention period', async () => {
    file.orphanedAt = new Date();
    await service.cleanupOrphanedFiles();
    expect(oss.deleteObject).not.toHaveBeenCalled();
  });

  it('cancels cleanup when a retained file was rebound', async () => {
    file.orphanedAt = new Date(Date.now() - 25 * 3600_000);
    manager.query.mockResolvedValue([{ referenced: true }]);
    await service.cleanupOrphanedFiles();
    expect(manager.update).toHaveBeenCalledWith(expect.anything(), file.id, { orphanedAt: null });
    expect(oss.deleteObject).not.toHaveBeenCalled();
  });

  it('commits a durable recycle job before removing file metadata', async () => {
    file.orphanedAt = new Date(Date.now() - 25 * 3600_000);
    await service.cleanupOrphanedFiles();
    expect(manager.delete).toHaveBeenCalled();
    expect(manager.insert).toHaveBeenCalledWith(expect.anything(), { fileId: file.id, ossKey: file.ossKey });
    expect(manager.insert.mock.invocationCallOrder[0]).toBeLessThan(manager.delete.mock.invocationCallOrder[0]!);
    expect(oss.deleteObject).not.toHaveBeenCalled();
  });

  it('skips all physical cleanup without a database connection', async () => {
    const disconnected = new FilesService(repository as never, oss as never, {} as never, {} as never);
    await disconnected.cleanupOrphanedFiles();
    expect(repository.find).not.toHaveBeenCalled();
    expect(oss.deleteObject).not.toHaveBeenCalled();
  });

  it('starts a new grace period after an authorized business unlink', async () => {
    const oldDate = new Date(Date.now() - 48 * 3600_000);
    file.orphanedAt = oldDate;
    await scheduleFileRecycle(manager as never, [file.id, file.id]);
    expect(file.orphanedAt?.getTime()).toBeGreaterThan(oldDate.getTime());
    expect(manager.save).toHaveBeenCalledTimes(1);
  });
});
