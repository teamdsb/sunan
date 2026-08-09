import { describe, expect, it } from 'vitest';

import {
  canManageCompanyContent,
  canManageSafety,
  canStartProcurement,
} from './permissions';

describe('frontend permission presentation', () => {
  it('keeps procurement creation available to every authenticated member', () => {
    expect(canStartProcurement(['all_authenticated'])).toBe(true);
    expect(canStartProcurement(['all_authenticated', 'crew'])).toBe(true);
  });

  it('does not mistake generic or crew membership for company-content management', () => {
    expect(canManageCompanyContent(['all_authenticated'])).toBe(false);
    expect(canManageCompanyContent(['all_authenticated', 'crew'])).toBe(false);
    expect(canManageCompanyContent(['all_authenticated', 'finance'])).toBe(true);
    expect(canManageCompanyContent(['all_authenticated', 'system_admin'])).toBe(
      true,
    );
  });

  it('limits safety template and plan management to its backend roles', () => {
    expect(canManageSafety(['all_authenticated', 'shipping'])).toBe(true);
    expect(canManageSafety(['all_authenticated', 'crew'])).toBe(false);
  });
});
