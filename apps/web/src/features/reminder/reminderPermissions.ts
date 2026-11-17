export const MANAGEMENT_ROLES = new Set([
  'system_admin',
  'general_office',
  'finance',
  'business',
  'shipping',
  'logistics',
]);

export function canManageReminderActions(roles: string[]): boolean {
  return roles.some((role) => MANAGEMENT_ROLES.has(role));
}

export function canAcknowledgeReminder(
  reminder: { canAcknowledge: boolean; status: string },
): boolean {
  if (['acknowledged', 'resolved'].includes(reminder.status)) {
    return false;
  }

  return reminder.canAcknowledge === true;
}

export function isOverdueReminder(reminder: { reminderType: string; status: string }): boolean {
  return reminder.reminderType === 'overdue' && !['acknowledged', 'resolved'].includes(reminder.status);
}
