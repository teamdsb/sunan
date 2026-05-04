import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { OfficeService } from './office.service';

function makeUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    userId: 'u1',
    corpId: 'corp',
    name: 'Test User',
    avatar: null,
    departments: ['总经办'],
    position: '经理',
    roles: ['all_authenticated', 'general_office'],
    isAdmin: false,
    ...overrides,
  };
}

describe('OfficeService (Wave3/Wave4 acceptance)', () => {
  const categoryRepository = {
    find: jest.fn(),
  };

  const entryRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const auditRepository = {
    create: jest.fn((input: Record<string, unknown>) => input),
    save: jest.fn(),
    findAndCount: jest.fn(),
  };

  const service = new OfficeService(
    categoryRepository as never,
    entryRepository as never,
    auditRepository as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects cross-category management by category maintainer', async () => {
    const shippingUser = makeUser({ roles: ['all_authenticated', 'shipping'], departments: ['船务部'] });

    await expect(
      service.createEntry(
        {
          categoryCode: 'customs',
          title: '海关入口',
          summary: '越权创建',
          iconType: 'customs',
          targetType: 'external_url',
          targetValue: 'https://office.example.com/customs',
          openMode: 'current_webview',
          visibilityRoles: ['all_authenticated'],
        },
        shippingUser,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows system admin to manage all categories', async () => {
    const adminUser = makeUser({ roles: ['all_authenticated', 'system_admin'], isAdmin: true });

    entryRepository.create.mockImplementation((input: Record<string, unknown>) => ({
      id: 'office-1',
      createdAt: new Date('2026-04-16T00:00:00.000Z'),
      updatedAt: new Date('2026-04-16T00:00:00.000Z'),
      ...input,
    }));
    entryRepository.save.mockImplementation(async (input: Record<string, unknown>) => input);

    const result = await service.createEntry(
      {
        categoryCode: 'customs',
        title: '海关入口',
        summary: '系统管理员创建',
        iconType: 'customs',
        targetType: 'external_url',
        targetValue: 'https://office.example.com/customs',
        openMode: 'current_webview',
        visibilityRoles: ['all_authenticated'],
      },
      adminUser,
    );

    expect(result.categoryCode).toBe('customs');
    expect(result.canManage).toBe(true);
  });

  it('hides draft/disabled entries from normal user detail view', async () => {
    const normalUser = makeUser({ roles: ['all_authenticated'] });

    entryRepository.findOne.mockResolvedValue({
      id: 'office-draft',
      categoryCode: 'maritime',
      title: '草稿入口',
      summary: 'draft',
      iconType: 'maritime',
      targetType: 'external_url',
      targetValue: 'https://office.example.com/draft',
      openMode: 'current_webview',
      visibilityRoles: ['all_authenticated'],
      managerRoles: ['general_office'],
      sortOrder: 10,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'u1',
      updatedBy: 'u1',
    });

    await expect(service.getEntry('office-draft', normalUser)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('enforces published status filter in list query', async () => {
    const andWhere = jest.fn().mockReturnThis();
    const where = jest.fn().mockReturnThis();
    const innerJoin = jest.fn().mockReturnThis();
    const orderBy = jest.fn().mockReturnThis();
    const addOrderBy = jest.fn().mockReturnThis();
    const getMany = jest.fn().mockResolvedValue([]);

    entryRepository.createQueryBuilder.mockReturnValue({
      innerJoin,
      where,
      andWhere,
      orderBy,
      addOrderBy,
      getMany,
    });

    await service.listEntries({}, makeUser({ roles: ['all_authenticated'] }));

    expect(andWhere).toHaveBeenCalledWith('entry.status = :status', { status: 'published' });
  });

  it('validates external URL and internal route whitelist', async () => {
    const managerUser = makeUser({ roles: ['all_authenticated', 'general_office'] });

    await expect(
      service.createEntry(
        {
          categoryCode: 'other',
          title: '非法 URL',
          summary: 'http not allowed',
          iconType: 'other',
          targetType: 'external_url',
          targetValue: 'http://office.example.com/unsafe',
          openMode: 'current_webview',
          visibilityRoles: ['all_authenticated'],
        },
        managerUser,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.createEntry(
        {
          categoryCode: 'other',
          title: '非法路由',
          summary: 'route not in allow list',
          iconType: 'other',
          targetType: 'internal_route',
          targetValue: '/admin/unsafe',
          openMode: 'current_webview',
          visibilityRoles: ['all_authenticated'],
        },
        managerUser,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns audit records with operator and timestamp for tracing', async () => {
    const managerUser = makeUser({ roles: ['all_authenticated', 'general_office'] });
    const now = new Date('2026-04-16T10:00:00.000Z');

    auditRepository.findAndCount.mockResolvedValue([
      [
        {
          id: 'audit-1',
          entryId: 'office-1',
          action: 'publish',
          operatorUserId: 'u1',
          payloadSnapshot: { status: 'published' },
          createdAt: now,
        },
      ],
      1,
    ]);

    entryRepository.find.mockResolvedValue([
      {
        id: 'office-1',
        title: '海事入口',
        categoryCode: 'maritime',
        deletedAt: null,
      },
    ]);

    const result = await service.listAudits({ page: 1, pageSize: 20 }, managerUser);

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: 'audit-1',
      entryId: 'office-1',
      entryTitle: '海事入口',
      action: 'publish',
      operatorUserId: 'u1',
    });
    expect(result.data[0]?.createdAt).toBe(now.toISOString());
    expect(result.meta.total).toBe(1);
  });

  it('filters out audit records outside manager-owned categories', async () => {
    const shippingUser = makeUser({ roles: ['all_authenticated', 'shipping'], departments: ['船务部'] });

    auditRepository.findAndCount.mockResolvedValue([
      [
        {
          id: 'audit-1',
          entryId: 'office-ship',
          action: 'update',
          operatorUserId: 'u1',
          payloadSnapshot: {},
          createdAt: new Date('2026-04-16T10:00:00.000Z'),
        },
        {
          id: 'audit-2',
          entryId: 'office-customs',
          action: 'update',
          operatorUserId: 'u2',
          payloadSnapshot: {},
          createdAt: new Date('2026-04-16T11:00:00.000Z'),
        },
      ],
      2,
    ]);

    entryRepository.find.mockResolvedValue([
      { id: 'office-ship', title: '船检入口', categoryCode: 'vessel_inspection', deletedAt: null },
      { id: 'office-customs', title: '海关入口', categoryCode: 'customs', deletedAt: null },
    ]);

    const result = await service.listAudits({}, shippingUser);

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.entryId).toBe('office-ship');
  });
});
