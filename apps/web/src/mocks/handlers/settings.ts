import type { UserSettings } from '../../features/settings/settingsApi';
import type { SettingsMockState } from '../fixtures/settings';
import { cloneUserSettings } from '../fixtures/settings';
import type { MockHandlerContext, MockRouteDefinition } from '../types';
import { createMockResponse } from '../utils';

const BASE_TIMESTAMP = Date.parse('2026-03-01T00:00:00.000Z');

type SettingsRuntimeState = MockHandlerContext['state'] & {
  settings: SettingsMockState;
};

function now(offsetMinutes = 1): string {
  return new Date(BASE_TIMESTAMP + offsetMinutes * 60_000).toISOString();
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function getSettingsState(context: MockHandlerContext): SettingsMockState {
  return (context.state as SettingsRuntimeState).settings;
}

function updateSettings(
  existing: UserSettings,
  input: Record<string, unknown>,
): UserSettings {
  return {
    ...existing,
    reminderViewMode:
      input.reminderViewMode === 'list' || input.reminderViewMode === 'dashboard'
        ? input.reminderViewMode
        : existing.reminderViewMode,
    certificateGroupBy:
      input.certificateGroupBy === 'type' || input.certificateGroupBy === 'owner'
        ? input.certificateGroupBy
        : existing.certificateGroupBy,
    enablePushNotifications:
      typeof input.enablePushNotifications === 'boolean'
        ? input.enablePushNotifications
        : existing.enablePushNotifications,
    updatedAt: now(),
  };
}

export const settingsHandlers: MockRouteDefinition[] = [
  {
    method: 'GET',
    path: '/settings',
    handler: (context) =>
      createMockResponse({
        data: cloneUserSettings(getSettingsState(context).settings),
      }),
  },
  {
    method: 'PATCH',
    path: '/settings',
    handler: (context) => {
      const state = getSettingsState(context);
      state.settings = updateSettings(state.settings, asObject(context.request.data));

      return createMockResponse({
        data: cloneUserSettings(state.settings),
      });
    },
  },
];
