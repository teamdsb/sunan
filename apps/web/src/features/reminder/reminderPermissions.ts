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
  userId: string | undefined,
  roles: string[],
  reminder: { recipientUserId: string; status: string },
): boolean {
  if (reminder.status === 'acknowledged') {
    return false;
  }

  return Boolean(userId && (userId === reminder.recipientUserId || canManageReminderActions(roles)));
}

export function isOverdueReminder(reminder: { reminderType: string; status: string }): boolean {
  return reminder.reminderType === 'overdue' && reminder.status !== 'acknowledged';
}
