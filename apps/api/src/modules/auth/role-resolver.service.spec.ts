import { RoleResolverService } from 'src/modules/auth/role-resolver.service';

describe('RoleResolverService', () => {
  const service = new RoleResolverService();

  it('maps business roles from department ids instead of department names', () => {
    expect(
      service.resolveRoles({
        departmentIds: [3, 6],
        departmentNames: ['已改名的部门', '另一个名称'],
        position: null,
        isSystemAdmin: false,
      }),
    ).toEqual(
      expect.arrayContaining([
        'all_authenticated',
        'general_office',
        'shipping',
      ]),
    );
  });

  it('maps all configured department ids and keeps generic departments unprivileged', () => {
    expect(
      service.resolveRoles({
        departmentIds: [1, 2, 3, 4, 5, 6, 7, 8],
        departmentNames: [],
        position: null,
        isSystemAdmin: false,
      }),
    ).toEqual([
      'all_authenticated',
      'general_office',
      'finance',
      'business',
      'shipping',
      'logistics',
      'crew',
    ]);

    expect(
      service.resolveRoles({
        departmentIds: [1, 2],
        departmentNames: ['公司成员', '待设置部门'],
        position: null,
        isSystemAdmin: false,
      }),
    ).toEqual(['all_authenticated']);
  });

  it('maps crew department to shipping data scope without shipping manager role', () => {
    expect(
      service.resolveRoles({
        departmentIds: [8],
        departmentNames: ['船员'],
        position: null,
        isSystemAdmin: false,
      }),
    ).toEqual(['all_authenticated', 'crew']);
    expect(
      service.resolveDepartmentCodes({
        departmentIds: [8],
        departmentNames: ['船员'],
      }),
    ).toEqual(['shipping_dept']);
  });

  it('deduplicates multi-department ids, roles, and data scopes', () => {
    expect(service.normalizeDepartmentIds([6, 4, 6, 0, -1, 4])).toEqual([
      6, 4,
    ]);
    expect(
      service.resolveDepartmentCodes({
        departmentIds: [6, 8, 4, 6],
        departmentNames: [],
      }),
    ).toEqual(['shipping_dept', 'finance_dept']);
  });

  it('keeps name-based resolution only for legacy records without department ids', () => {
    expect(
      service.resolveRoles({
        departmentIds: [],
        departmentNames: ['财务部'],
        position: null,
        isSystemAdmin: false,
      }),
    ).toEqual(['all_authenticated', 'finance']);
  });

  it('adds system admin independently for members in generic departments', () => {
    expect(
      service.resolveRoles({
        departmentIds: [1, 2],
        departmentNames: ['公司成员', '待设置部门'],
        position: null,
        isSystemAdmin: true,
      }),
    ).toEqual(expect.arrayContaining(['all_authenticated', 'system_admin']));
  });

  it('keeps the crew position fallback for legacy assignments', () => {
    expect(
      service.resolveRoles({
        departmentIds: [1],
        departmentNames: ['公司成员'],
        position: '船长',
        isSystemAdmin: false,
      }),
    ).toEqual(['all_authenticated', 'crew']);
  });

  it('provides canonical and diagnostic department name fallbacks', () => {
    expect(service.resolveFallbackDepartmentName(3)).toBe('总经办');
    expect(service.resolveFallbackDepartmentName(99)).toBe('部门 99');
  });
});
