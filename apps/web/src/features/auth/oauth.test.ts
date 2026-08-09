import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildWecomOAuthUrl,
  consumeRedirectTarget,
  hasCurrentOauthPermissionVersion,
  markCurrentOauthPermissionVersion,
  scheduleOauthPermissionRetry,
  setRedirectTarget,
} from './oauth';

describe('OAuth redirect target safety', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it('preserves a local task deep link with its notification query', () => {
    setRedirectTarget('/workbench/tasks/task-1?notificationId=delivery-1');
    expect(consumeRedirectTarget()).toBe('/workbench/tasks/task-1?notificationId=delivery-1');
  });

  it.each(['https://evil.example/task', '//evil.example/task', '/\\evil.example/task'])(
    'rejects unsafe redirect target %s',
    (target) => {
      setRedirectTarget(target);
      expect(consumeRedirectTarget()).toBe('/my');
    },
  );

  it('requests private user information so WeCom can issue an avatar user ticket', () => {
    const url = buildWecomOAuthUrl('/my');

    expect(url).toContain('scope=snsapi_privateinfo');
  });

  it('marks the browser after the private-information authorization succeeds', () => {
    expect(hasCurrentOauthPermissionVersion()).toBe(false);

    markCurrentOauthPermissionVersion();

    expect(hasCurrentOauthPermissionVersion()).toBe(true);
  });

  it('retries a failed private-information authorization after a cooldown', () => {
    const now = Date.parse('2026-08-10T00:00:00.000Z');

    scheduleOauthPermissionRetry(now);

    expect(window.localStorage.getItem('sunan_oauth_permission_version')).toBeNull();
    expect(hasCurrentOauthPermissionVersion(now + 60 * 60 * 1000)).toBe(true);
    expect(hasCurrentOauthPermissionVersion(now + 24 * 60 * 60 * 1000)).toBe(false);
  });
});
