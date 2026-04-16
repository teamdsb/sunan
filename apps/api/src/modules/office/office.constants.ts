export const OFFICE_CATEGORY_DEFINITIONS = [
  { code: 'maritime', name: '海事', sortOrder: 10, isEnabled: true, managerRoles: ['shipping', 'general_office'] },
  { code: 'customs', name: '海关', sortOrder: 20, isEnabled: true, managerRoles: ['business', 'general_office'] },
  { code: 'border_inspection', name: '边检', sortOrder: 30, isEnabled: true, managerRoles: ['business', 'shipping', 'general_office'] },
  { code: 'vessel_inspection', name: '船检', sortOrder: 40, isEnabled: true, managerRoles: ['shipping', 'general_office'] },
  { code: 'environment', name: '环保', sortOrder: 50, isEnabled: true, managerRoles: ['logistics', 'shipping', 'general_office'] },
  { code: 'other', name: '其他', sortOrder: 60, isEnabled: true, managerRoles: ['general_office', 'system_admin'] },
  { code: 'petrochemical_park', name: '石化园区', sortOrder: 70, isEnabled: true, managerRoles: ['business', 'general_office'] },
] as const;

export const OFFICE_INTERNAL_ROUTE_PREFIXES = ['/my', '/office', '/procurement', '/workbench'] as const;
export const OFFICE_VISIBILITY_ROLES = [
  'all_authenticated',
  'system_admin',
  'general_office',
  'finance',
  'business',
  'shipping',
  'logistics',
  'crew',
] as const;
export const OFFICE_TARGET_TYPES = ['external_url', 'internal_route'] as const;
export const OFFICE_OPEN_MODES = ['current_webview', 'new_window'] as const;
export const OFFICE_STATUSES = ['draft', 'published', 'disabled'] as const;
