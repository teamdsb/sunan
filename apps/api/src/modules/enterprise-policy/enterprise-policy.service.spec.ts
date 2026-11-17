import type { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { EnterprisePolicyService } from './enterprise-policy.service';
import * as fileRetention from 'src/modules/files/file-retention';

describe('EnterprisePolicyService published content', () => {
  const user: CurrentUser = { userId: 'admin', corpId: 'corp', name: '管理员', avatar: null, departments: [], position: null, roles: ['system_admin'], isAdmin: true };
  afterEach(() => jest.restoreAllMocks());

  function setup(status: 'published' | 'deprecated' | 'draft' = 'published') {
    const entity = { id: 'p1', title: '发布时标题', policyCode: 'P1', version: 'v1', summary: '发布时正文', status, effectiveDate: null, publishedAt: status === 'draft' ? null : new Date('2026-11-17T00:00:00.000Z') };
    const manager = { findOne: jest.fn().mockResolvedValue(entity), find: jest.fn().mockResolvedValue([]), save: jest.fn(async (input: unknown) => input), create: jest.fn((_type: unknown, input: unknown) => input), delete: jest.fn().mockResolvedValue({ affected: 0 }) };
    const builder = { update: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), execute: jest.fn() };
    const repository = { manager: { transaction: jest.fn(async (callback: (value: typeof manager) => unknown) => callback(manager)) }, create: jest.fn((input: object) => Object.assign(entity, input)), save: jest.fn(async (input: unknown) => input), createQueryBuilder: jest.fn().mockReturnValue(builder) };
    const service = new EnterprisePolicyService(repository as never, {} as never, {} as never, { findOne: jest.fn().mockResolvedValue(null) } as never, {} as never);
    jest.spyOn(service, 'getById').mockResolvedValue(entity as never);
    jest.spyOn(fileRetention, 'assertAttachmentFilesBindable').mockResolvedValue(new Set(['f1']));
    return { service, entity, manager };
  }

  it.each(['published', 'deprecated'] as const)('rejects content changes to a %s historical version while deprecating', async (status) => {
    const { service, entity, manager } = setup(status);
    await expect(service.update('p1', { status: 'deprecated', title: '篡改标题' }, user)).rejects.toMatchObject({ status: 403 });
    expect(entity.title).toBe('发布时标题');
    expect(manager.save).not.toHaveBeenCalled();
  });

  it.each(['published', 'deprecated'] as const)('rejects binding and unbinding files on a %s historical version', async (status) => {
    const { service, manager } = setup(status);
    await expect(service.bindFiles('p1', { fileIds: ['f1'] }, user)).rejects.toMatchObject({ status: 403 });
    await expect(service.unbindFile('p1', 'f1', user)).rejects.toMatchObject({ status: 403 });
    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.delete).not.toHaveBeenCalled();
  });

  it('allows a pure deprecation without changing the published content', async () => {
    const { service, entity } = setup();
    await service.update('p1', { status: 'deprecated' }, user);
    expect(entity).toMatchObject({ status: 'deprecated', title: '发布时标题', summary: '发布时正文' });
  });

  it('keeps draft attachment editing available', async () => {
    const { service, manager } = setup('draft');
    await service.bindFiles('p1', { fileIds: ['f1'] }, user);
    expect(manager.save).toHaveBeenCalled();
  });

  it('binds initial attachments before publishing a newly created version', async () => {
    const { service, entity } = setup('draft');
    jest.spyOn(service, 'bindFiles').mockImplementation(async () => {
      expect(entity.status).toBe('draft');
      return entity as never;
    });
    const publish = jest.spyOn(service, 'publish').mockImplementation(async () => {
      entity.status = 'published';
      return entity as never;
    });
    await service.create({ title: '新版本', policyCode: 'P1', version: 'v2', status: 'published', fileIds: ['f1'] }, user);
    expect(publish).toHaveBeenCalledWith('p1', user);
  });
});

describe('EnterprisePolicyService department scope', () => {
  const user: CurrentUser = {
    userId: 'multi-department-user',
    corpId: 'corp-1',
    name: '财务兼总经办',
    avatar: null,
    departments: ['总经办', '财务部'],
    position: null,
    roles: ['all_authenticated', 'general_office', 'finance'],
    isAdmin: false,
  };

  it('loads department memberships once when mapping a list page', async () => {
    const entities = ['policy-1', 'policy-2'].map((id, index) => ({
      id,
      title: id,
      policyCode: `POLICY-${index + 1}`,
      version: '1.0',
      summary: null,
      status: 'published',
      effectiveDate: null,
      publishedAt: null,
      departmentCode: index === 0 ? 'general_office' : 'finance_dept',
      createdAt: new Date('2026-08-09T00:00:00.000Z'),
      updatedAt: new Date('2026-08-09T00:00:00.000Z'),
    }));
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([entities, entities.length]),
    };
    const wecomUserRepository = {
      findOne: jest.fn().mockResolvedValue({
        departmentCodes: ['general_office', 'finance_dept'],
      }),
    };
    const service = new EnterprisePolicyService(
      { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder) } as never,
      { find: jest.fn().mockResolvedValue([]) } as never,
      {} as never,
      wecomUserRepository as never,
      {} as never,
    );

    const result = await service.list({}, user);

    expect(wecomUserRepository.findOne).toHaveBeenCalledTimes(1);
    expect(result.data.map((item) => item.canManage)).toEqual([true, true]);
  });
});
