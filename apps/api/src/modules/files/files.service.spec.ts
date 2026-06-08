import { BadRequestException, NotFoundException } from '@nestjs/common';

import { FilesService } from 'src/modules/files/files.service';
import { OssService } from 'src/modules/files/oss.service';
import { WecomHttpGateway } from 'src/modules/wecom/wecom-http.gateway';
import { WecomTokenService } from 'src/modules/wecom/wecom-token.service';

describe('FilesService', () => {
  const fileRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const ossService = {
    createUploadSignature: jest.fn(),
    createDownloadSignature: jest.fn(),
    uploadBuffer: jest.fn(),
  } as unknown as jest.Mocked<OssService>;

  const wecomTokenService = {
    getAccessToken: jest.fn(),
  } as unknown as jest.Mocked<WecomTokenService>;

  const wecomHttpGateway = {
    getMedia: jest.fn(),
  } as unknown as jest.Mocked<WecomHttpGateway>;

  const service = new FilesService(
    fileRepository as never,
    ossService,
    wecomTokenService,
    wecomHttpGateway,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    ossService.createUploadSignature.mockResolvedValue({
      uploadUrl: 'https://oss.example.com/upload',
      expiresAt: '2026-01-01T00:00:00.000Z',
      headers: { 'Content-Type': 'application/pdf' },
    });
    ossService.createDownloadSignature.mockResolvedValue({
      downloadUrl: 'https://oss.example.com/download',
      expiresAt: '2026-01-01T00:10:00.000Z',
    });
  });

  it('creates a presigned upload payload', async () => {
    const result = await service.createPresign({
      category: 'certificates',
      fileName: '证书.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
    });

    expect(result.ossKey).toMatch(/^certificates\/\d{4}\/\d{2}\/.+\.pdf$/);
    expect(ossService.createUploadSignature.mock.calls.length).toBe(1);
  });

  it('rejects unsupported categories', async () => {
    await expect(
      service.createPresign({
        category: 'unknown',
        fileName: '证书.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('registers callback and returns download url', async () => {
    fileRepository.findOne.mockResolvedValue(null);
    fileRepository.create.mockImplementation(
      (input: Record<string, unknown>) => input,
    );
    fileRepository.save.mockResolvedValue({
      id: 'file-1',
      ossKey: 'certificates/2026/03/file-1.pdf',
      fileName: '证书.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
      category: 'certificates',
      uploadedBy: 'u1',
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
    });

    const result = await service.registerCallback(
      {
        ossKey: 'certificates/2026/03/file-1.pdf',
        fileName: '证书.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        category: 'certificates',
      },
      {
        userId: 'u1',
        corpId: 'corp',
        name: '张三',
        avatar: null,
        departments: [],
        position: null,
        roles: [],
        isAdmin: false,
      },
    );

    expect(fileRepository.save).toHaveBeenCalled();
    expect(result.downloadUrl).toBe('https://oss.example.com/download');
  });

  it('returns 404 for unknown oss key download', async () => {
    fileRepository.findOne.mockResolvedValue(null);

    await expect(service.getDownloadUrl('missing/file.pdf')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('downloads media from wecom and uploads to oss', async () => {
    wecomTokenService.getAccessToken.mockResolvedValue('access-token');
    wecomHttpGateway.getMedia.mockResolvedValue({
      buffer: Buffer.from('file'),
      contentType: 'image/jpeg',
    });
    fileRepository.create.mockImplementation(
      (input: Record<string, unknown>) => input,
    );
    fileRepository.save.mockResolvedValue({
      id: 'file-2',
      ossKey: 'inspection-photos/2026/03/file-2.jpg',
      fileName: 'wecom-media-1.jpg',
      mimeType: 'image/jpeg',
      fileSize: 4,
      category: 'inspection-photos',
      uploadedBy: 'u1',
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
    });

    const result = await service.saveFromWecom(
      { mediaId: 'media-1', category: 'inspection-photos' },
      {
        userId: 'u1',
        corpId: 'corp',
        name: '张三',
        avatar: null,
        departments: [],
        position: null,
        roles: [],
        isAdmin: false,
      },
    );

    expect(ossService.uploadBuffer.mock.calls.length).toBe(1);
    expect(result.mimeType).toBe('image/jpeg');
  });
});
