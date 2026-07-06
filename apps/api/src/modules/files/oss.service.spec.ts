import { encodeOssMetadataValue } from 'src/modules/files/oss.service';

describe('encodeOssMetadataValue', () => {
  const originalEnv = process.env;

  afterEach(() => {
    jest.resetModules();
    process.env = originalEnv;
  });

  it('keeps original file metadata header values browser compatible', () => {
    const encoded = encodeOssMetadataValue('证书 2026.pdf');

    expect(encoded).toBe('%E8%AF%81%E4%B9%A6%202026.pdf');
    expect(
      () => new Headers({ 'x-amz-meta-original-name': encoded }),
    ).not.toThrow();
    expect(
      () => new Headers({ 'x-amz-meta-original-name': '证书 2026.pdf' }),
    ).toThrow(/ByteString/);
  });

  it('creates S3 presigned upload URLs without empty-body checksum query parameters', async () => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      OSS_DRIVER: 's3',
      OSS_REGION: 'us-east-1',
      OSS_BUCKET: 'sunan-files',
      OSS_ACCESS_KEY_ID: 'sunan',
      OSS_ACCESS_KEY_SECRET: 'object-storage-secret-strong',
      OSS_ENDPOINT: 'http://sunan-oss:9000',
      OSS_PUBLIC_ENDPOINT: 'https://oss.qzssncb.com',
    };
    const { OssService } = await import('src/modules/files/oss.service');

    const payload = await new OssService().createUploadSignature(
      'certificates/2026/07/file.pdf',
      'application/pdf',
      '证书 2026.pdf',
    );
    const uploadUrl = new URL(payload.uploadUrl);
    const signedHeaders = decodeURIComponent(
      uploadUrl.searchParams.get('X-Amz-SignedHeaders') ?? '',
    );

    expect(uploadUrl.searchParams.has('x-amz-checksum-crc32')).toBe(false);
    expect(uploadUrl.searchParams.has('x-amz-sdk-checksum-algorithm')).toBe(
      false,
    );
    expect(signedHeaders).toContain('x-amz-meta-original-name');
    expect(payload.headers['x-amz-meta-original-name']).toBe(
      '%E8%AF%81%E4%B9%A6%202026.pdf',
    );
  });
});
