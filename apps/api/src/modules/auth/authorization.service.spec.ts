import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { AuthorizationService } from 'src/modules/auth/authorization.service';
import { RoleResolverService } from 'src/modules/auth/role-resolver.service';

function makeUser(overrides: Partial<WecomUserEntity> = {}): WecomUserEntity {
  return {
    id: 'uuid-1',
    userId: 'member-1',
    corpId: 'ww-test-corp',
    name: '成员',
    avatarUrl: null,
    departmentIds: [6],
    departmentCodes: ['shipping_dept'],
    departmentNames: ['船务部'],
    position: '船长',
    isSystemAdmin: false,
    sourceStatus: 'active',
    sourceStatusUpdatedAt: new Date(),
    lastLoginAt: null,
    loginStatus: 'unknown',
    lastSyncAt: new Date(),
    sourceRevision: 10,
    sourceBatchId: null,
    platformStatus: 'enabled',
    platformStatusReason: null,
    platformStatusChangedAt: null,
    departmentMode: 'follow_wecom',
    manualDepartmentIds: [],
    roleMode: 'auto',
    manualRoles: [],
    authorizationVersion: 1,
    rawProfile: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AuthorizationService', () => {
  const repository = { manager: { transaction: jest.fn() } };
  const dataSource = { query: jest.fn() };
  const adminService = { isSystemAdmin: jest.fn((userId: string) => userId === 'admin-1') };

  beforeEach(() => jest.clearAllMocks());

  function createService() {
    return new AuthorizationService(
      repository as never,
      dataSource as never,
      new RoleResolverService(),
      adminService as never,
    );
  }

  it('lets manual roles replace automatic department and position roles, including an explicit empty list', () => {
    const service = createService();
    const user = makeUser({
      departmentMode: 'manual',
      manualDepartmentIds: [1],
      roleMode: 'manual',
      manualRoles: [],
      position: '船长',
    });

    expect(service.getEffectiveAuthorization(user)).toMatchObject({
      departmentIds: [1],
      roles: ['all_authenticated'],
      isAdmin: false,
    });
  });

  it('allows an env administrator to bypass platform disabled but not an unavailable source account', () => {
    const service = createService();
    const disabledAdmin = makeUser({ userId: 'admin-1', platformStatus: 'disabled' });
    expect(service.getEffectiveAuthorization(disabledAdmin).roles).toEqual(
      expect.arrayContaining(['system_admin']),
    );

    expect(() =>
      service.getEffectiveAuthorization({ ...disabledAdmin, sourceStatus: 'inactive' }),
    ).toThrow(ForbiddenException);
  });

  it('rejects users from another enterprise before calculating roles', () => {
    const service = createService();
    expect(() =>
      service.getEffectiveAuthorization(makeUser({ corpId: 'other-corp' })),
    ).toThrow(UnauthorizedException);
  });

  it('ignores an older source revision without touching the existing user', async () => {
    const existing = makeUser({ sourceRevision: 10 });
    const manager = {
      findOne: jest.fn().mockResolvedValue(existing),
      update: jest.fn(),
    };
    repository.manager.transaction.mockImplementation(async (callback: (manager: unknown) => unknown) => callback(manager));
    const service = createService();

    const result = await service.applySourceProfile({
      userId: existing.userId,
      corpId: existing.corpId,
      name: '旧资料',
      avatarUrl: null,
      departmentIds: [3],
      departmentNames: ['总经办'],
      departmentCodes: ['general_office'],
      position: null,
      rawProfile: {},
      sourceStatus: 'active',
      sourceRevision: 9,
    });

    expect(result.ignored).toBe(true);
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('does not erase a known source status when a partial source response omits status', async () => {
    const existing = makeUser({ sourceStatus: 'active', sourceRevision: 10 });
    const manager = {
      findOne: jest.fn().mockResolvedValue(existing),
      update: jest.fn(),
      findOneOrFail: jest.fn().mockResolvedValue({ ...existing, sourceRevision: 11 }),
    };
    repository.manager.transaction.mockImplementation(async (callback: (manager: unknown) => unknown) => callback(manager));
    const service = createService();

    await service.applySourceProfile({
      userId: existing.userId,
      corpId: existing.corpId,
      name: existing.name,
      avatarUrl: existing.avatarUrl,
      departmentIds: existing.departmentIds,
      departmentNames: existing.departmentNames,
      departmentCodes: existing.departmentCodes,
      position: existing.position,
      rawProfile: {},
      sourceStatus: 'unknown',
      sourceRevision: 11,
    });

    expect(manager.update).toHaveBeenCalledWith(
      WecomUserEntity,
      { id: existing.id },
      expect.objectContaining({ sourceStatus: 'active' }),
    );
  });
});
