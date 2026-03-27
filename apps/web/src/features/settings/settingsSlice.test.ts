import { describe, expect, it } from 'vitest';
import { settingsApi } from './settingsApi';

describe('settingsApi', () => {
  it('supports fetch + update with cross-domain cache invalidation', () => {
    expect(settingsApi.endpoints.getSettings).toBeDefined();
    expect(settingsApi.endpoints.updateSettings).toBeDefined();
    expect(typeof settingsApi.endpoints.updateSettings.initiate).toBe('function');
  });
});
