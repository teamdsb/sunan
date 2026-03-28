export const MANAGEMENT_ROLES = new Set([
  'general_office',
  'finance',
  'business',
  'shipping',
  'logistics',
]);

const ROLE_BY_DEPARTMENT_NAME = new Map<string, string>([
  ['总经办', 'general_office'],
  ['财务部', 'finance'],
  ['业务部', 'business'],
  ['船务部', 'shipping'],
  ['后勤部', 'logistics'],
]);

export function resolveRolesFromDepartmentNames(
  departmentNames: string[],
  isSystemAdmin: boolean,
): string[] {
  const roles = new Set<string>(['all_authenticated']);

  departmentNames.forEach((departmentName) => {
    const role = ROLE_BY_DEPARTMENT_NAME.get(departmentName);
    if (role) {
      roles.add(role);
    }
  });

  if (isSystemAdmin) {
    roles.add('system_admin');
  }

  return [...roles];
}

export function isManagementRole(role: string): boolean {
  return MANAGEMENT_ROLES.has(role);
}
