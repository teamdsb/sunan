import { RoleResolverService } from 'src/modules/auth/role-resolver.service';

describe('RoleResolverService', () => {
  const service = new RoleResolverService();

  it('maps department and crew roles', () => {
    expect(
      service.resolveRoles({
        departmentNames: ['总经办', '船务部'],
        position: '船长',
        isSystemAdmin: false,
      }),
    ).toEqual(
      expect.arrayContaining([
        'all_authenticated',
        'general_office',
        'shipping',
        'crew',
      ]),
    );
  });

  it('adds system admin when flagged', () => {
    expect(
      service.resolveRoles({
        departmentNames: [],
        position: null,
        isSystemAdmin: true,
      }),
    ).toEqual(expect.arrayContaining(['all_authenticated', 'system_admin']));
  });
});
