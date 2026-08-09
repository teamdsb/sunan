export const MANAGEMENT_ROLES = new Set([
  'general_office',
  'finance',
  'business',
  'shipping',
  'logistics',
]);

const MANAGEMENT_POSITION_PATTERN = /(经理|主管|主任|部长|总监|总经理|副总|负责人)/;

const ROLE_BY_DEPARTMENT_NAME = new Map<string, string>([
  ['总经办', 'general_office'],
  ['财务部', 'finance'],
  ['业务部', 'business'],
  ['船务部', 'shipping'],
  ['后勤部', 'logistics'],
]);

const ROLE_BY_DEPARTMENT_ID = new Map<number, string>([
  [3, 'general_office'],
  [4, 'finance'],
  [5, 'business'],
  [6, 'shipping'],
  [7, 'logistics'],
  [8, 'crew'],
]);

export function resolveRolesFromDepartments(
  departmentIds: number[],
  departmentNames: string[],
): string[] {
  const roles = new Set<string>(['all_authenticated']);

  if (departmentIds.length > 0) {
    departmentIds.forEach((departmentId) => {
      const role = ROLE_BY_DEPARTMENT_ID.get(departmentId);
      if (role) {
        roles.add(role);
      }
    });
  } else {
    departmentNames.forEach((departmentName) => {
      const role = ROLE_BY_DEPARTMENT_NAME.get(departmentName);
      if (role) {
        roles.add(role);
      }
    });
  }

  return [...roles];
}

export function isManagementRole(role: string): boolean {
  return MANAGEMENT_ROLES.has(role);
}

export function isManagementPosition(position: string | null | undefined): boolean {
  return Boolean(position && MANAGEMENT_POSITION_PATTERN.test(position));
}
