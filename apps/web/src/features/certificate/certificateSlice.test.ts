import { describe, expect, it } from 'vitest';
import { certificateApi } from './certificateApi';

describe('certificateApi', () => {
  it('supports list/grouped/detail and file binding', () => {
    expect(certificateApi.endpoints.getCertificates).toBeDefined();
    expect(certificateApi.endpoints.getGroupedCertificates).toBeDefined();
    expect(certificateApi.endpoints.getCertificateById).toBeDefined();
    expect(certificateApi.endpoints.bindCertificateFiles).toBeDefined();
  });
});
