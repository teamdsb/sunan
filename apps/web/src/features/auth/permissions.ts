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

const MASTER_DATA_MANAGER_ROLES = new Set(['system_admin', 'general_office', 'shipping']);

export function canManageCompanyContent(roles: string[]): boolean {
  return roles.some((role) => COMPANY_CONTENT_MANAGER_ROLES.has(role));
}

export function canManageSafety(roles: string[]): boolean {
  return roles.some((role) => SAFETY_MANAGER_ROLES.has(role));
}

export function canManageMasterData(roles: string[]): boolean {
  return roles.some((role) => MASTER_DATA_MANAGER_ROLES.has(role));
}

export function canStartProcurement(roles: string[]): boolean {
  return roles.includes('all_authenticated');
}
