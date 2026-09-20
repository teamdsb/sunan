import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';

import type { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { FileEntity } from 'src/database/entities/file.entity';
import { FileRecycleJobEntity } from 'src/database/entities/file-recycle-job.entity';
import { FileCallbackDto } from 'src/modules/files/dto/file-callback.dto';
import { FileFromWecomDto } from 'src/modules/files/dto/file-from-wecom.dto';
import { FilePresignDto } from 'src/modules/files/dto/file-presign.dto';
import {
  FILE_CATEGORY_RULES,
  FILE_EXTENSION_RULES,
  GENERIC_FILE_MIME_TYPES,
  MIME_EXTENSION_MAP,
} from 'src/modules/files/files.constants';
import { OssService } from 'src/modules/files/oss.service';
import { WecomHttpGateway } from 'src/modules/wecom/wecom-http.gateway';
import { WecomTokenService } from 'src/modules/wecom/wecom-token.service';
import { FILE_RETENTION_MS, hasFileReferences } from './file-retention';

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
export class FilesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FilesService.name);
  private cleanupTimer: NodeJS.Timeout | null = null;
  private cleanupRun: Promise<void> | null = null;
  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly ossService: OssService,
    private readonly wecomTokenService: WecomTokenService,
    private readonly wecomHttpGateway: WecomHttpGateway,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  onModuleInit(): void {
    void this.cleanupOrphanedFiles();
    this.cleanupTimer = setInterval(() => void this.cleanupOrphanedFiles(), 60 * 60 * 1000);
    this.cleanupTimer.unref();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.cleanupTimer = null;
    await this.cleanupRun;
  }

  async deleteIfOrphaned(id: string, currentUser: CurrentUser): Promise<void> {
    if (!this.dataSource) throw new BadRequestException('文件回收服务未就绪');
    await this.dataSource.transaction(async (manager) => {
      const file = await manager.findOne(FileEntity, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!file) throw new NotFoundException('文件不存在');
      if (file.uploadedBy !== currentUser.userId && !currentUser.roles.includes('system_admin')) {
        throw new ForbiddenException('无权回收此文件');
      }
      if (await hasFileReferences(manager, id)) {
        throw new BadRequestException('文件仍被业务记录或历史证据引用，请在业务详情解除关联');
      }
      file.orphanedAt ??= new Date();
      await manager.save(FileEntity, file);
    });
  }

  async cleanupOrphanedFiles(): Promise<void> {
    if (!this.dataSource || this.cleanupRun) return;
    this.cleanupRun = this.sweepOrphanedFiles().catch((error: unknown) => {
      this.logger.error('File recycle sweep failed', error instanceof Error ? error.stack : undefined);
    });
    try { await this.cleanupRun; } finally { this.cleanupRun = null; }
  }

  private async sweepOrphanedFiles(): Promise<void> {
    const cutoff = new Date(Date.now() - FILE_RETENTION_MS);
    const candidates = await this.fileRepository.find({
      where: { orphanedAt: LessThanOrEqual(cutoff) },
      order: { orphanedAt: 'ASC' },
      take: 200,
    });
    for (const candidate of candidates) {
      try {
        await this.dataSource!.transaction(async (manager) => {
          // FKs and the legacy snapshot trigger serialize new references against this row lock.
          const file = await manager.findOne(FileEntity, { where: { id: candidate.id }, lock: { mode: 'pessimistic_write' } });
          if (!file?.orphanedAt || file.orphanedAt > cutoff) return;
          if (await hasFileReferences(manager, file.id)) {
            await manager.update(FileEntity, file.id, { orphanedAt: null });
            return;
          }
          // Commit removal and its durable storage job together before touching OSS.
          await manager.insert(FileRecycleJobEntity, { fileId: file.id, ossKey: file.ossKey });
          await manager.delete(FileEntity, file.id);
        });
      } catch (error) {
        this.logger.error(`File recycle failed for ${candidate.id}; will retry`, error instanceof Error ? error.stack : undefined);
      }
    }
    // Move failed jobs behind less-attempted work so one bad batch cannot starve the queue.
    const jobs = await this.dataSource!.getRepository(FileRecycleJobEntity).find({ where: { completedAt: IsNull() }, order: { attempts: 'ASC', createdAt: 'ASC' }, take: 200 });
    for (const job of jobs) {
      await this.dataSource!.transaction(async (manager) => {
        const pending = await manager.getRepository(FileRecycleJobEntity).createQueryBuilder('job')
          .where('job.fileId = :id AND job.completedAt IS NULL', { id: job.fileId }).setLock('pessimistic_write').setOnLocked('skip_locked').getOne();
        if (!pending) return;
        try {
          await this.ossService.deleteObject(pending.ossKey);
          await manager.update(FileRecycleJobEntity, pending.fileId, { completedAt: new Date(), lastError: null });
          this.logger.log(`Recycled file ${pending.fileId}`);
        } catch (error) {
          await manager.update(FileRecycleJobEntity, pending.fileId, {
            attempts: pending.attempts + 1,
            lastError: error instanceof Error ? error.message : 'Storage deletion failed',
          });
          this.logger.error(`OSS recycle failed for ${pending.fileId}; queued for retry`);
        }
      });
    }
  }

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
      normalized.mimeType,
      dto.fileName,
    );

    return {
      uploadUrl: signature.uploadUrl,
      ossKey,
      mimeType: normalized.mimeType,
      expiresAt: signature.expiresAt,
      headers: signature.headers,
    };
  }

  getPolicy(category: string) {
    const rule = FILE_CATEGORY_RULES[category];
    if (!rule) {
      throw new BadRequestException('不支持的文件分类');
    }

    return {
      category,
      maxSize: rule.maxSize,
      extensions: [...rule.extensions],
      accept: rule.extensions.map((extension) => `.${extension}`).join(','),
      mimeTypes: Object.fromEntries(
        rule.extensions.map((extension) => [
          extension,
          FILE_EXTENSION_RULES[extension]?.mimeType ??
            'application/octet-stream',
        ]),
      ),
    };
  }

  async registerCallback(
    dto: FileCallbackDto,
    currentUser?: CurrentUser,
  ): Promise<FileResponse> {
    const normalized = this.validateFileRequest(
      dto.category,
      dto.fileName,
      dto.mimeType,
      dto.fileSize,
    );
    this.validateOssKeyBelongsToCategory(dto.ossKey, dto.category);

    const existing = await this.fileRepository.findOne({
      where: { ossKey: dto.ossKey },
    });
    if (existing) {
      return this.toFileResponse(existing);
    }
    if (this.dataSource) {
      const recycled = await this.dataSource.getRepository(FileRecycleJobEntity).findOne({
        where: { ossKey: dto.ossKey },
      });
      if (recycled) throw new BadRequestException('文件已进入回收流程，请重新上传');
    }

    const entity = this.fileRepository.create({
      ossKey: dto.ossKey,
      fileName: dto.fileName,
      mimeType: normalized.mimeType,
      fileSize: dto.fileSize,
      category: dto.category,
      uploadedBy: currentUser?.userId ?? null,
      orphanedAt: new Date(),
    });

    const saved = await this.fileRepository.save(entity);
    return this.toFileResponse(saved);
  }

  async getDownloadUrl(
    ossKey: string,
  ): Promise<{ downloadUrl: string; expiresAt: string }> {
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
    const idempotentNamePrefix = `wecom-${dto.mediaId}.`;
    const existing = await this.fileRepository
      .createQueryBuilder('file')
      .where('file.category = :category', { category: dto.category })
      .andWhere('file.file_name LIKE :fileName', {
        fileName: `${idempotentNamePrefix}%`,
      })
      .getOne();
    if (existing) {
      return this.toFileResponse(existing);
    }
    const accessToken = await this.wecomTokenService.getAccessToken();
    const media = await this.wecomHttpGateway.getMedia(
      accessToken,
      dto.mediaId,
    );
    const mimeType = media.contentType.toLowerCase();
    const extension = MIME_EXTENSION_MAP[mimeType];

    if (!extension) {
      throw new BadRequestException('不支持的企业微信媒体类型');
    }

    const normalized = this.validateFileRequest(
      dto.category,
      `wecom-${dto.mediaId}.${extension}`,
      mimeType,
      media.buffer.length,
    );

    const ossKey = this.buildOssKey(dto.category, extension);
    const fileName = `wecom-${dto.mediaId}.${extension}`;

    await this.ossService.uploadBuffer(
      ossKey,
      media.buffer,
      normalized.mimeType,
      fileName,
    );

    const entity = this.fileRepository.create({
      ossKey,
      fileName,
      mimeType: normalized.mimeType,
      fileSize: media.buffer.length,
      category: dto.category,
      uploadedBy: currentUser?.userId ?? null,
      orphanedAt: new Date(),
    });
    const saved = await this.fileRepository.save(entity);

    return this.toFileResponse(saved);
  }

  private validateFileRequest(
    category: string,
    fileName: string,
    mimeType: string,
    fileSize: number,
  ): { extension: string; mimeType: string } {
    const rule = FILE_CATEGORY_RULES[category];
    if (!rule) {
      throw new BadRequestException('不支持的文件分类');
    }

    const extension = extname(fileName).replace(/^\./, '').toLowerCase();
    if (!extension || !rule.extensions.includes(extension)) {
      throw new BadRequestException('文件扩展名不符合要求');
    }

    const extensionRule = FILE_EXTENSION_RULES[extension];
    if (!extensionRule) {
      throw new BadRequestException('文件类型不符合要求');
    }

    const normalizedMimeType = mimeType.trim().toLowerCase();
    const compatibleMimeTypes = new Set([
      extensionRule.mimeType,
      ...(extensionRule.compatibleMimeTypes ?? []),
    ]);

    if (
      !GENERIC_FILE_MIME_TYPES.has(normalizedMimeType) &&
      !compatibleMimeTypes.has(normalizedMimeType)
    ) {
      throw new BadRequestException('文件类型不符合要求');
    }

    if (fileSize > rule.maxSize) {
      throw new BadRequestException('文件大小超出限制');
    }

    return { extension, mimeType: extensionRule.mimeType };
  }

  private buildOssKey(category: string, extension: string): string {
    const rule = FILE_CATEGORY_RULES[category];
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');

    return `${rule?.storagePrefix ?? category}/${year}/${month}/${randomUUID()}.${extension}`;
  }

  private validateOssKeyBelongsToCategory(
    ossKey: string,
    category: string,
  ): void {
    const rule = FILE_CATEGORY_RULES[category];
    const prefixes = [category, rule?.storagePrefix].filter(Boolean);

    if (!prefixes.some((prefix) => ossKey.startsWith(`${prefix}/`))) {
      throw new BadRequestException('文件路径与分类不匹配');
    }
  }

  private async toFileResponse(file: FileEntity): Promise<FileResponse> {
    const signature = await this.ossService.createDownloadSignature(
      file.ossKey,
    );

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
