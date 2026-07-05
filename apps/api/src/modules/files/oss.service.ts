import { Injectable } from '@nestjs/common';
import {
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import OSS from 'ali-oss';

import { appEnv } from 'src/config/env';

export interface PresignedUploadPayload {
  uploadUrl: string;
  headers: Record<string, string>;
  expiresAt: string;
}

@Injectable()
export class OssService {
  private readonly aliyunClient?: OSS;
  private readonly s3Client?: S3Client;
  private readonly s3PresignClient?: S3Client;

  constructor() {
    if (appEnv.OSS_DRIVER === 's3') {
      if (!appEnv.OSS_ENDPOINT) {
        throw new Error('OSS_ENDPOINT is required when OSS_DRIVER=s3');
      }

      const credentials = {
        accessKeyId: appEnv.OSS_ACCESS_KEY_ID,
        secretAccessKey: appEnv.OSS_ACCESS_KEY_SECRET,
      };

      this.s3Client = new S3Client({
        region: appEnv.OSS_REGION,
        endpoint: appEnv.OSS_ENDPOINT,
        forcePathStyle: appEnv.OSS_FORCE_PATH_STYLE,
        credentials,
      });
      this.s3PresignClient = new S3Client({
        region: appEnv.OSS_REGION,
        endpoint: appEnv.OSS_PUBLIC_ENDPOINT ?? appEnv.OSS_ENDPOINT,
        forcePathStyle: appEnv.OSS_FORCE_PATH_STYLE,
        credentials,
      });
      return;
    }

    this.aliyunClient = new OSS({
      region: appEnv.OSS_REGION,
      bucket: appEnv.OSS_BUCKET,
      accessKeyId: appEnv.OSS_ACCESS_KEY_ID,
      accessKeySecret: appEnv.OSS_ACCESS_KEY_SECRET,
    });
  }

  async createUploadSignature(
    ossKey: string,
    mimeType: string,
    originalName: string,
  ): Promise<PresignedUploadPayload> {
    const headers = {
      'Content-Type': mimeType,
      'x-oss-meta-original-name': originalName,
    };

    if (this.aliyunClient) {
      const uploadUrl = this.aliyunClient.signatureUrl(ossKey, {
        method: 'PUT',
        expires: appEnv.OSS_PRESIGN_EXPIRE,
        headers,
      });
      const expiresAt = new Date(
        Date.now() + appEnv.OSS_PRESIGN_EXPIRE * 1000,
      ).toISOString();

      return {
        uploadUrl,
        expiresAt,
        headers,
      };
    }

    const command = new PutObjectCommand({
      Bucket: appEnv.OSS_BUCKET,
      Key: ossKey,
      ContentType: mimeType,
      Metadata: {
        'original-name': originalName,
      },
    });
    const uploadUrl = await getSignedUrl(this.getS3PresignClient(), command, {
      expiresIn: appEnv.OSS_PRESIGN_EXPIRE,
    });
    const expiresAt = new Date(
      Date.now() + appEnv.OSS_PRESIGN_EXPIRE * 1000,
    ).toISOString();

    return {
      uploadUrl,
      expiresAt,
      headers: {
        'Content-Type': mimeType,
        'x-amz-meta-original-name': originalName,
      },
    };
  }

  async createDownloadSignature(ossKey: string): Promise<{
    downloadUrl: string;
    expiresAt: string;
  }> {
    if (this.aliyunClient) {
      const downloadUrl = this.aliyunClient.signatureUrl(ossKey, {
        method: 'GET',
        expires: appEnv.OSS_DOWNLOAD_EXPIRE,
      });
      const expiresAt = new Date(
        Date.now() + appEnv.OSS_DOWNLOAD_EXPIRE * 1000,
      ).toISOString();

      return { downloadUrl, expiresAt };
    }

    const command = new GetObjectCommand({
      Bucket: appEnv.OSS_BUCKET,
      Key: ossKey,
    });
    const downloadUrl = await getSignedUrl(this.getS3PresignClient(), command, {
      expiresIn: appEnv.OSS_DOWNLOAD_EXPIRE,
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
    if (this.aliyunClient) {
      await this.aliyunClient.put(ossKey, body, {
        headers: {
          'Content-Type': mimeType,
          'x-oss-meta-original-name': originalName,
        },
      });
      return;
    }

    await this.getS3Client().send(
      new PutObjectCommand({
        Bucket: appEnv.OSS_BUCKET,
        Key: ossKey,
        Body: body,
        ContentType: mimeType,
        Metadata: {
          'original-name': originalName,
        },
      }),
    );
  }

  async checkConnection(): Promise<void> {
    if (this.aliyunClient) {
      await this.aliyunClient.getBucketInfo(appEnv.OSS_BUCKET);
      return;
    }

    await this.getS3Client().send(
      new HeadBucketCommand({
        Bucket: appEnv.OSS_BUCKET,
      }),
    );
  }

  private getS3Client(): S3Client {
    if (!this.s3Client) {
      throw new Error('S3 client is not configured');
    }

    return this.s3Client;
  }

  private getS3PresignClient(): S3Client {
    if (!this.s3PresignClient) {
      throw new Error('S3 presign client is not configured');
    }

    return this.s3PresignClient;
  }
}
