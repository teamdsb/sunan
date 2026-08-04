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
    createQueryBuilder: jest.fn(),
  };
  const queryBuilder = {
    where: jest.fn(),
    andWhere: jest.fn(),
    getOne: jest.fn(),
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
    queryBuilder.where.mockReturnValue(queryBuilder);
    queryBuilder.andWhere.mockReturnValue(queryBuilder);
    queryBuilder.getOne.mockResolvedValue(null);
    fileRepository.createQueryBuilder.mockReturnValue(queryBuilder);
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

  it('uses domain storage prefixes for procurement and workbench attachments', async () => {
    const procurement = await service.createPresign({
      category: 'procurement-attachments',
      fileName: '采购附件.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
    });
    const workbench = await service.createPresign({
      category: 'workbench-attachments',
      fileName: '会议记录.docx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileSize: 1024,
    });

    expect(procurement.ossKey).toMatch(
      /^procurement\/attachments\/\d{4}\/\d{2}\//,
    );
    expect(workbench.ossKey).toMatch(/^workbench\/attachments\/\d{4}\/\d{2}\//);
  });

  it.each([
    ['说明.txt', '', 'text/plain'],
    ['清单.csv', 'application/octet-stream', 'text/csv'],
    ['现场照片.heic', 'image/heic', 'image/heic'],
    ['资料.zip', 'application/x-zip-compressed', 'application/zip'],
    ['归档.rar', 'application/x-rar-compressed', 'application/vnd.rar'],
    ['制度.wps', 'application/kswps', 'application/vnd.ms-works'],
    ['台账.et', 'application/kset', 'application/vnd.ms-excel'],
    ['演示.dps', 'application/ksdps', 'application/vnd.ms-powerpoint'],
  ])(
    'normalizes supported business attachment %s to %s',
    async (fileName, mimeType, expectedMimeType) => {
      const result = await service.createPresign({
        category: 'procurement-attachments',
        fileName,
        mimeType,
        fileSize: 1024,
      });

      expect(result.mimeType).toBe(expectedMimeType);
      expect(ossService.createUploadSignature.mock.calls.at(-1)).toEqual([
        expect.stringMatching(/^procurement\/attachments\//),
        expectedMimeType,
        fileName,
      ]);
    },
  );

  it('exposes the effective upload policy for a category', () => {
    expect(service.getPolicy('enterprise-policies')).toEqual(
      expect.objectContaining({
        category: 'enterprise-policies',
        maxSize: 50 * 1024 * 1024,
        extensions: expect.arrayContaining([
          'txt',
          'csv',
          'heic',
          'zip',
          'rar',
          'wps',
          'et',
          'dps',
        ]),
      }),
    );
  });

  it('rejects an explicit mime type that conflicts with the extension', async () => {
    await expect(
      service.createPresign({
        category: 'procurement-attachments',
        fileName: '说明.txt',
        mimeType: 'image/png',
        fileSize: 1024,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('keeps specialist categories restricted to their own formats', async () => {
    await expect(
      service.createPresign({
        category: 'certificates',
        fileName: '说明.txt',
        mimeType: 'text/plain',
        fileSize: 1024,
      }),
    ).rejects.toThrow(BadRequestException);
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

    await expect(
      service.getDownloadUrl('missing/file.pdf'),
    ).rejects.toBeInstanceOf(NotFoundException);
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
