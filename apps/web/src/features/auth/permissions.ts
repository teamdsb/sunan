const COMPANY_CONTENT_MANAGER_ROLES = new Set([
  'system_admin',
  'general_office',
  'finance',
  'business',
  'shipping',
  'logistics',
]);

const SAFETY_MANAGER_ROLES = new Set([
  'system_admin',
  'safety_manager',
  'shipping',
]);

export function canManageCompanyContent(roles: string[]): boolean {
  return roles.some((role) => COMPANY_CONTENT_MANAGER_ROLES.has(role));
}

export function canManageSafety(roles: string[]): boolean {
  return roles.some((role) => SAFETY_MANAGER_ROLES.has(role));
}

export function canStartProcurement(roles: string[]): boolean {
  return roles.includes('all_authenticated');
}
