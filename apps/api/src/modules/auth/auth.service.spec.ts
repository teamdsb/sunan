import { AuthService } from 'src/modules/auth/auth.service';
import { RoleResolverService } from 'src/modules/auth/role-resolver.service';
import type { WecomUserEntity } from 'src/database/entities/wecom-user.entity';

describe('AuthService', () => {
  it.each([
    ['http://shp.qpic.cn/bizmp/wang/0', 'http://shp.qpic.cn/bizmp/wang/0'],
    ['', 'https://old.example/avatar.png'],
  ])(
    'uses the OAuth user ticket and preserves an existing avatar when the sensitive avatar is %p',
    async (sensitiveAvatar, expectedAvatar) => {
      const user = {
        userId: 'member-1',
        corpId: 'ww-test-corp',
        name: '王工',
        avatarUrl: 'https://old.example/avatar.png',
        departmentIds: [3],
        departmentNames: ['总经办'],
        departmentCodes: ['general_office'],
        position: null,
        isSystemAdmin: false,
        rawProfile: {},
      };
      const repository = {
        findOne: jest.fn().mockResolvedValue(user),
        create: jest.fn((value: Partial<WecomUserEntity>) => value),
        save: jest.fn().mockImplementation(
          async (value: Partial<WecomUserEntity>) =>
            Object.assign(user, value),
        ),
        findOneOrFail: jest.fn().mockResolvedValue(user),
      };
      const gateway = {
        getUserInfo: jest.fn().mockResolvedValue({
          UserId: 'member-1',
          user_ticket: 'ticket-1',
        }),
        getUserDetail: jest.fn().mockResolvedValue({
          userid: 'member-1',
          name: '王工',
          department: [3],
        }),
        getUserSensitiveDetail: jest.fn().mockResolvedValue({
          userid: 'member-1',
          avatar: sensitiveAvatar,
        }),
        listDepartments: jest.fn().mockResolvedValue({
          department: [{ id: 3, name: '总经办' }],
        }),
      };
      const jwt = { signAsync: jest.fn().mockResolvedValue('jwt') };
      const tokenService = { getAccessToken: jest.fn().mockResolvedValue('token') };
      const adminService = { isSystemAdmin: jest.fn().mockReturnValue(false) };
      const service = new AuthService(
        repository as never,
        jwt as never,
        tokenService as never,
        gateway as never,
        new RoleResolverService(),
        adminService as never,
      );

      const result = await service.exchangeCode('code-1');

      expect(gateway.getUserSensitiveDetail).toHaveBeenCalledWith('token', 'ticket-1');
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          avatarUrl: expectedAvatar,
        }),
      );
      expect(result.user.avatar).toBe(expectedAvatar);
      expect(result.privateInfoAuthorized).toBe(true);
    },
  );

  it('reports a retryable private-information failure without discarding an existing avatar', async () => {
    const user = {
      userId: 'member-1',
      corpId: 'ww-test-corp',
      name: '王工',
      avatarUrl: 'https://old.example/avatar.png',
      departmentIds: [3],
      departmentNames: ['总经办'],
      departmentCodes: ['general_office'],
      position: null,
      isSystemAdmin: false,
      rawProfile: {},
    };
    const repository = {
      findOne: jest.fn().mockResolvedValue(user),
      create: jest.fn((value: Partial<WecomUserEntity>) => value),
      save: jest.fn().mockImplementation(
        async (value: Partial<WecomUserEntity>) => Object.assign(user, value),
      ),
      findOneOrFail: jest.fn().mockResolvedValue(user),
    };
    const gateway = {
      getUserInfo: jest.fn().mockResolvedValue({
        UserId: 'member-1',
        user_ticket: 'ticket-1',
      }),
      getUserDetail: jest.fn().mockResolvedValue({
        userid: 'member-1',
        name: '王工',
        department: [3],
      }),
      getUserSensitiveDetail: jest.fn().mockRejectedValue(new Error('temporary failure')),
      listDepartments: jest.fn().mockResolvedValue({
        department: [{ id: 3, name: '总经办' }],
      }),
    };
    const service = new AuthService(
      repository as never,
      { signAsync: jest.fn().mockResolvedValue('jwt') } as never,
      { getAccessToken: jest.fn().mockResolvedValue('token') } as never,
      gateway as never,
      new RoleResolverService(),
      { isSystemAdmin: jest.fn().mockReturnValue(false) } as never,
    );

    const result = await service.exchangeCode('code-1');

    expect(result.privateInfoAuthorized).toBe(false);
    expect(result.user.avatar).toBe('https://old.example/avatar.png');
  });
});
