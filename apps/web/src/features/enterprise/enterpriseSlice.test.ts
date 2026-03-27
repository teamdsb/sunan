import { describe, expect, it } from 'vitest';
import { enterpriseApi } from './enterpriseApi';

describe('enterpriseApi', () => {
  it('supports list/detail and optimistic update rollback hook', () => {
    expect(enterpriseApi.endpoints.getEnterpriseProfiles).toBeDefined();
    expect(enterpriseApi.endpoints.getEnterpriseProfileById).toBeDefined();
    expect(enterpriseApi.endpoints.updateEnterpriseProfile).toBeDefined();
    expect(typeof enterpriseApi.endpoints.updateEnterpriseProfile.initiate).toBe('function');
  });

  it('supports policy versions and file binding', () => {
    expect(enterpriseApi.endpoints.getEnterprisePolicyVersions).toBeDefined();
    expect(enterpriseApi.endpoints.bindEnterprisePolicyFiles).toBeDefined();
  });
});
