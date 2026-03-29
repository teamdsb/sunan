import type { UserSettings } from '../../features/settings/settingsApi';

const BASE_TIMESTAMP = Date.parse('2026-03-01T00:00:00.000Z');

export interface SettingsMockState {
  settings: UserSettings;
}

function timestamp(offsetMinutes: number): string {
  return new Date(BASE_TIMESTAMP + offsetMinutes * 60_000).toISOString();
}

export function cloneUserSettings(settings: UserSettings): UserSettings {
  return { ...settings };
}

export function createSettingsMockState(): SettingsMockState {
  return {
    settings: {
      id: 'settings-1',
      userId: 'mock-admin',
      defaultModule: 'my',
      reminderViewMode: 'dashboard',
      certificateGroupBy: 'owner',
      enablePushNotifications: true,
      theme: 'light',
      updatedAt: timestamp(0),
    },
  };
}
