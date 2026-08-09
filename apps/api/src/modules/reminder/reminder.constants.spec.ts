import { resolveRolesFromDepartments } from './reminder.constants';

describe('resolveRolesFromDepartments', () => {
  it('uses department ids for multi-department roles', () => {
    expect(
      resolveRolesFromDepartments(
        [1, 4, 6],
        ['公司成员', '已改名财务', '已改名船务'],
      ),
    ).toEqual(['all_authenticated', 'finance', 'shipping']);
  });

  it('does not infer privileged roles from generic departments', () => {
    expect(
      resolveRolesFromDepartments(
        [1, 2],
        ['公司成员', '待设置部门'],
      ),
    ).toEqual(['all_authenticated']);
  });

  it('keeps name fallback for records that predate department id storage', () => {
    expect(resolveRolesFromDepartments([], ['总经办'])).toEqual([
      'all_authenticated',
      'general_office',
    ]);
  });
});
