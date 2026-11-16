import { UserDirectoryService } from 'src/modules/user-directory/user-directory.service';
import type { WecomUserEntity } from 'src/database/entities/wecom-user.entity';

function makeUser(userId: string, loginStatus: WecomUserEntity['loginStatus']): WecomUserEntity {
  return {
    id: userId,
    userId,
    corpId: 'ww-test-corp',
    name: userId,
    avatarUrl: null,
    departmentIds: [],
    departmentCodes: [],
    departmentNames: [],
    position: null,
    isSystemAdmin: false,
    sourceStatus: 'active',
    sourceStatusUpdatedAt: null,
    lastLoginAt: null,
    loginStatus,
    lastSyncAt: null,
    sourceRevision: 1,
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
  };
}

describe('UserDirectoryService', () => {
  it('filters logged-in and not-logged-in members without treating the false filter as logged-in', async () => {
    const users = [
      makeUser('logged-in', 'logged_in'),
      makeUser('never-logged-in', 'never'),
      makeUser('unknown-login', 'unknown'),
    ];
    const repository = { find: jest.fn().mockResolvedValue(users) };
    const authorizationService = {
      getEffectiveAuthorization: jest.fn().mockReturnValue({
        departmentIds: [],
        departmentCodes: [],
        departments: [],
        roles: ['all_authenticated'],
        isAdmin: false,
      }),
    };
    const roleResolver = {
      resolveRoles: jest.fn().mockReturnValue(['all_authenticated']),
    };
    const service = new UserDirectoryService(
      repository as never,
      {} as never,
      {} as never,
      {} as never,
      authorizationService as never,
      roleResolver as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const loggedIn = await service.listUsers({ hasLoggedIn: true, page: 1, pageSize: 20 });
    const notLoggedIn = await service.listUsers({ hasLoggedIn: false, page: 1, pageSize: 20 });

    expect(loggedIn.items.map((item) => item.userId)).toEqual(['logged-in']);
    expect(notLoggedIn.items.map((item) => item.userId)).toEqual([
      'never-logged-in',
      'unknown-login',
    ]);
  });
});
