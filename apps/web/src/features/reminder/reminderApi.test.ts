import { describe, expect, it } from 'vitest';
import { reminderApi } from './reminderApi';

describe('reminderApi', () => {
  it('exposes dashboard, list, detail, acknowledge, and scan endpoints', () => {
    expect(reminderApi.endpoints.getReminderDashboard).toBeDefined();
    expect(reminderApi.endpoints.getReminderList).toBeDefined();
    expect(reminderApi.endpoints.getReminderById).toBeDefined();
    expect(reminderApi.endpoints.acknowledgeReminder).toBeDefined();
    expect(reminderApi.endpoints.triggerReminderScan).toBeDefined();
  });
});
