import { Injectable } from '@nestjs/common';
import OSS from 'ali-oss';

import { appEnv } from 'src/config/env';

export interface PresignedUploadPayload {
  uploadUrl: string;
  headers: Record<string, string>;
  expiresAt: string;
}

@Injectable()
export class OssService {
  private readonly client = new OSS({
    region: appEnv.OSS_REGION,
    bucket: appEnv.OSS_BUCKET,
    accessKeyId: appEnv.OSS_ACCESS_KEY_ID,
    accessKeySecret: appEnv.OSS_ACCESS_KEY_SECRET,
  });

  createUploadSignature(
    ossKey: string,
    mimeType: string,
    originalName: string,
  ): PresignedUploadPayload {
    const uploadUrl = this.client.signatureUrl(ossKey, {
      method: 'PUT',
      expires: appEnv.OSS_PRESIGN_EXPIRE,
    });
    const expiresAt = new Date(
      Date.now() + appEnv.OSS_PRESIGN_EXPIRE * 1000,
    ).toISOString();

    return {
      uploadUrl,
      expiresAt,
      headers: {
        'Content-Type': mimeType,
        'x-oss-meta-original-name': originalName,
      },
    };
  }

  createDownloadSignature(ossKey: string): {
    downloadUrl: string;
    expiresAt: string;
  } {
    const downloadUrl = this.client.signatureUrl(ossKey, {
      method: 'GET',
      expires: appEnv.OSS_DOWNLOAD_EXPIRE,
    });
    const expiresAt = new Date(
      Date.now() + appEnv.OSS_DOWNLOAD_EXPIRE * 1000,
    ).toISOString();

    return { downloadUrl, expiresAt };
  }

  async uploadBuffer(
    ossKey: string,
    body: Buffer,
    mimeType: string,
    originalName: string,
  ): Promise<void> {
    await this.client.put(ossKey, body, {
      headers: {
        'Content-Type': mimeType,
        'x-oss-meta-original-name': originalName,
      },
    });
  }
}
