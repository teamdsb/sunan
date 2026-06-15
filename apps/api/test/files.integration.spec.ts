import type {
  CanActivate,
  ExecutionContext,
  INestApplication,
} from '@nestjs/common';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  bootstrapPgTestDatabase,
  buildPgTypeOrmOptions,
  shutdownPgTestDatabase,
} from 'test/pg-test-container';
import request from 'supertest';

import { configureApp } from 'src/app.bootstrap';
import { FilesModule } from 'src/modules/files/files.module';
import { OssService } from 'src/modules/files/oss.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { REDIS_CLIENT } from 'src/modules/wecom/wecom.constants';
import { WecomHttpGateway } from 'src/modules/wecom/wecom-http.gateway';
import { WecomTokenService } from 'src/modules/wecom/wecom-token.service';

const authGuard: CanActivate = {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ user?: unknown }>();
    request.user = {
      userId: 'tester',
      corpId: 'ww-test',
      name: '娴嬭瘯鐢ㄦ埛',
      avatar: null,
      departments: ['General Office'],
      position: null,
      roles: ['all_authenticated'],
      isAdmin: false,
    };
    return true;
  },
};

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        await bootstrapPgTestDatabase();
        return buildPgTypeOrmOptions();
      },
    }),
    FilesModule,
  ],
})
class TestFilesModule {}

describe('FilesController integration', () => {
  let app: INestApplication;

  interface PresignResponseBody {
    data: {
      ossKey: string;
    };
  }

  interface FileResponseBody {
    data: {
      ossKey: string;
      mimeType: string;
      downloadUrl: string;
    };
  }

  const ossServiceMock = {
    createUploadSignature: jest.fn(),
    createDownloadSignature: jest.fn(),
    uploadBuffer: jest.fn(),
  };

  const wecomTokenServiceMock = {
    getAccessToken: jest.fn(),
  };

  const wecomHttpGatewayMock = {
    getMedia: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestFilesModule],
    })
      .overrideProvider(REDIS_CLIENT)
      .useValue({
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
      })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuard)
      .overrideProvider(OssService)
      .useValue(ossServiceMock)
      .overrideProvider(WecomTokenService)
      .useValue(wecomTokenServiceMock)
      .overrideProvider(WecomHttpGateway)
      .useValue(wecomHttpGatewayMock)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await shutdownPgTestDatabase();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ossServiceMock.createUploadSignature.mockReturnValue({
      uploadUrl: 'https://oss.example.com/upload',
      expiresAt: '2026-03-01T01:00:00.000Z',
      headers: {
        'Content-Type': 'application/pdf',
        'x-oss-meta-original-name': '璇佷功.pdf',
      },
    });
    ossServiceMock.createDownloadSignature.mockReturnValue({
      downloadUrl: 'https://oss.example.com/download',
      expiresAt: '2026-03-01T01:15:00.000Z',
    });
    wecomTokenServiceMock.getAccessToken.mockResolvedValue('access-token');
    wecomHttpGatewayMock.getMedia.mockResolvedValue({
      buffer: Buffer.from('jpeg'),
      contentType: 'image/jpeg',
    });
  });

  it('completes presign -> callback flow', async () => {
    const presign = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/files/presign')
      .set('Authorization', 'Bearer token')
      .send({
        fileName: '璇佷功.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        category: 'certificates',
      });
    const presignBody = presign.body as PresignResponseBody;

    expect(presign.status).toBe(201);
    expect(presignBody.data.ossKey).toMatch(/^certificates\//);

    const callback = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/files/callback')
      .set('Authorization', 'Bearer token')
      .send({
        ossKey: presignBody.data.ossKey,
        fileName: '璇佷功.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        category: 'certificates',
      });
    const callbackBody = callback.body as FileResponseBody;

    expect(callback.status).toBe(201);
    expect(callbackBody.data.downloadUrl).toBe(
      'https://oss.example.com/download',
    );
  });

  it('rejects oversize files', async () => {
    const response = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/files/presign')
      .set('Authorization', 'Bearer token')
      .send({
        fileName: '鍒跺害.pdf',
        mimeType: 'application/pdf',
        fileSize: 60 * 1024 * 1024,
        category: 'enterprise-policies',
      });

    expect(response.status).toBe(400);
  });

  it('returns download url for saved file', async () => {
    const callback = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/files/callback')
      .set('Authorization', 'Bearer token')
      .send({
        ossKey: 'certificates/2026/03/file-1.pdf',
        fileName: '璇佷功.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        category: 'certificates',
      });
    const callbackBody = callback.body as FileResponseBody;

    const response = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get(
        `/api/v1/files/${encodeURIComponent(callbackBody.data.ossKey)}/download-url`,
      )
      .set('Authorization', 'Bearer token');
    const responseBody = response.body as FileResponseBody;

    expect(response.status).toBe(200);
    expect(responseBody.data.downloadUrl).toBe(
      'https://oss.example.com/download',
    );
  });

  it('returns 404 for unknown oss key', async () => {
    const response = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get(
        `/api/v1/files/${encodeURIComponent('certificates/2026/03/missing.pdf')}/download-url`,
      )
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(404);
  });

  it('uploads image via wecom media relay', async () => {
    const response = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/files/from-wecom')
      .set('Authorization', 'Bearer token')
      .send({
        mediaId: 'media-1',
        category: 'inspection-photos',
      });
    const responseBody = response.body as FileResponseBody;

    expect(response.status).toBe(201);
    expect(ossServiceMock.uploadBuffer).toHaveBeenCalled();
    expect(responseBody.data.mimeType).toBe('image/jpeg');
  });
});
