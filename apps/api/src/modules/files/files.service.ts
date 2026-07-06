import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';

import type { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { FileEntity } from 'src/database/entities/file.entity';
import { FileCallbackDto } from 'src/modules/files/dto/file-callback.dto';
import { FileFromWecomDto } from 'src/modules/files/dto/file-from-wecom.dto';
import { FilePresignDto } from 'src/modules/files/dto/file-presign.dto';
import {
  FILE_CATEGORY_RULES,
  MIME_EXTENSION_MAP,
} from 'src/modules/files/files.constants';
import { OssService } from 'src/modules/files/oss.service';
import { WecomHttpGateway } from 'src/modules/wecom/wecom-http.gateway';
import { WecomTokenService } from 'src/modules/wecom/wecom-token.service';

interface FileResponse {
  id: string;
  ossKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  category: string;
  downloadUrl: string;
  createdAt: string;
}

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly ossService: OssService,
    private readonly wecomTokenService: WecomTokenService,
    private readonly wecomHttpGateway: WecomHttpGateway,
  ) {}

  async createPresign(dto: FilePresignDto) {
    const normalized = this.validateFileRequest(
      dto.category,
      dto.fileName,
      dto.mimeType,
      dto.fileSize,
    );
    const ossKey = this.buildOssKey(dto.category, normalized.extension);
    const signature = await this.ossService.createUploadSignature(
      ossKey,
      dto.mimeType,
      dto.fileName,
    );

    return {
      uploadUrl: signature.uploadUrl,
      ossKey,
      expiresAt: signature.expiresAt,
      headers: signature.headers,
    };
  }

  async registerCallback(
    dto: FileCallbackDto,
    currentUser?: CurrentUser,
  ): Promise<FileResponse> {
    this.validateFileRequest(dto.category, dto.fileName, dto.mimeType, dto.fileSize);
    this.validateOssKeyBelongsToCategory(dto.ossKey, dto.category);

    const existing = await this.fileRepository.findOne({
      where: { ossKey: dto.ossKey },
    });
    if (existing) {
      return this.toFileResponse(existing);
    }

    const entity = this.fileRepository.create({
      ossKey: dto.ossKey,
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      fileSize: dto.fileSize,
      category: dto.category,
      uploadedBy: currentUser?.userId ?? null,
    });

    const saved = await this.fileRepository.save(entity);
    return this.toFileResponse(saved);
  }

  async getDownloadUrl(ossKey: string): Promise<{ downloadUrl: string; expiresAt: string }> {
    const file = await this.fileRepository.findOne({ where: { ossKey } });
    if (!file) {
      throw new NotFoundException('文件不存在');
    }

    return this.ossService.createDownloadSignature(file.ossKey);
  }

  async saveFromWecom(
    dto: FileFromWecomDto,
    currentUser?: CurrentUser,
  ): Promise<FileResponse> {
    const accessToken = await this.wecomTokenService.getAccessToken();
    const media = await this.wecomHttpGateway.getMedia(accessToken, dto.mediaId);
    const mimeType = media.contentType.toLowerCase();
    const extension = MIME_EXTENSION_MAP[mimeType];

    if (!extension) {
      throw new BadRequestException('不支持的企业微信媒体类型');
    }

    this.validateFileRequest(
      dto.category,
      `wecom-${dto.mediaId}.${extension}`,
      mimeType,
      media.buffer.length,
    );

    const ossKey = this.buildOssKey(dto.category, extension);
    const fileName = `wecom-${dto.mediaId}.${extension}`;

    await this.ossService.uploadBuffer(ossKey, media.buffer, mimeType, fileName);

    const entity = this.fileRepository.create({
      ossKey,
      fileName,
      mimeType,
      fileSize: media.buffer.length,
      category: dto.category,
      uploadedBy: currentUser?.userId ?? null,
    });
    const saved = await this.fileRepository.save(entity);

    return this.toFileResponse(saved);
  }

  private validateFileRequest(
    category: string,
    fileName: string,
    mimeType: string,
    fileSize: number,
  ): { extension: string } {
    const rule = FILE_CATEGORY_RULES[category];
    if (!rule) {
      throw new BadRequestException('不支持的文件分类');
    }

    const extension = extname(fileName).replace(/^\./, '').toLowerCase();
    if (!extension || !rule.extensions.includes(extension)) {
      throw new BadRequestException('文件扩展名不符合要求');
    }

    if (!rule.mimeTypes.includes(mimeType.toLowerCase())) {
      throw new BadRequestException('文件类型不符合要求');
    }

    if (fileSize > rule.maxSize) {
      throw new BadRequestException('文件大小超出限制');
    }

    return { extension };
  }

  private buildOssKey(category: string, extension: string): string {
    const rule = FILE_CATEGORY_RULES[category];
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');

    return `${rule?.storagePrefix ?? category}/${year}/${month}/${randomUUID()}.${extension}`;
  }

  private validateOssKeyBelongsToCategory(ossKey: string, category: string): void {
    const rule = FILE_CATEGORY_RULES[category];
    const prefixes = [category, rule?.storagePrefix].filter(Boolean);

    if (!prefixes.some((prefix) => ossKey.startsWith(`${prefix}/`))) {
      throw new BadRequestException('文件路径与分类不匹配');
    }
  }

  private async toFileResponse(file: FileEntity): Promise<FileResponse> {
    const signature = await this.ossService.createDownloadSignature(file.ossKey);

    return {
      id: file.id,
      ossKey: file.ossKey,
      fileName: file.fileName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      category: file.category,
      downloadUrl: signature.downloadUrl,
      createdAt: file.createdAt.toISOString(),
    };
  }
}
