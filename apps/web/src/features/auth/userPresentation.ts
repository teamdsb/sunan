import type { CurrentUser } from './types';

const GENERIC_DEPARTMENT_IDS = new Set([1, 2]);

const departmentLabelByRole: Record<string, string> = {
  general_office: '总经办',
  finance: '财务部',
  business: '业务部',
  shipping: '船务部',
  logistics: '后勤部',
  crew: '船员',
};

export function formatDepartmentNames(
  user: Pick<CurrentUser, 'department' | 'departmentIds' | 'roles'> | null,
): string {
  if (!user) {
    return '未设置部门';
  }

  const memberships = user.department
    .map((name, index) => ({
      id: user.departmentIds?.[index],
      name: name.trim(),
    }))
    .filter((membership) => membership.name.length > 0);
  const hasSpecificDepartment = memberships.some(
    ({ id }) => id !== undefined && !GENERIC_DEPARTMENT_IDS.has(id),
  );
  const displayNames = memberships
    .filter(
      ({ id }) =>
        !hasSpecificDepartment ||
        id === undefined ||
        !GENERIC_DEPARTMENT_IDS.has(id),
    )
    .map(({ name }) => name)
    .filter((name, index, names) => names.indexOf(name) === index);

  if (displayNames.length > 0) {
    return displayNames.join(' / ');
  }

  const fallback = user.roles
    .map((role) => departmentLabelByRole[role])
    .find(Boolean);

  return fallback ?? '未设置部门';
}
