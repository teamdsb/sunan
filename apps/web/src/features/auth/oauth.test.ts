import { beforeEach, describe, expect, it } from 'vitest';

import { consumeRedirectTarget, setRedirectTarget } from './oauth';

describe('OAuth redirect target safety', () => {
  beforeEach(() => window.sessionStorage.clear());

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
});
