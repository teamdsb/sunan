import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { EnterpriseProfileEntity } from 'src/database/entities/enterprise-profile.entity';
import { EnterpriseProfileFileEntity } from 'src/database/entities/enterprise-profile-file.entity';
import { FileEntity } from 'src/database/entities/file.entity';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { EnterpriseProfileBindFilesDto } from './dto/enterprise-profile-bind-files.dto';
import { EnterpriseProfileCreateDto } from './dto/enterprise-profile-create.dto';
import { EnterpriseProfileListQueryDto } from './dto/enterprise-profile-list-query.dto';
import { EnterpriseProfileUpdateDto } from './dto/enterprise-profile-update.dto';
import { OssService } from 'src/modules/files/oss.service';

const MANAGER_ROLES = new Set(['general_office', 'finance', 'business', 'shipping', 'logistics']);

@Injectable()
export class EnterpriseProfileService {
  constructor(
    @InjectRepository(EnterpriseProfileEntity)
    private readonly repository: Repository<EnterpriseProfileEntity>,
    @InjectRepository(EnterpriseProfileFileEntity)
    private readonly fileRelRepository: Repository<EnterpriseProfileFileEntity>,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    @InjectRepository(WecomUserEntity)
    private readonly wecomUserRepository: Repository<WecomUserEntity>,
    private readonly ossService: OssService,
  ) {}

  async list(query: EnterpriseProfileListQueryDto, user: CurrentUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const qb = this.repository.createQueryBuilder('p').where('p.deletedAt IS NULL');
    if (query.category) qb.andWhere('p.category = :category', { category: query.category });
    if (query.status) qb.andWhere('p.status = :status', { status: query.status });
    if (!user.roles.includes('system_admin')) {
      qb.andWhere('p.status != :archived', { archived: 'archived' });
    }

    const [items, total] = await qb.orderBy('p.updatedAt', 'DESC').skip((page - 1) * pageSize).take(pageSize).getManyAndCount();

    const data = await Promise.all(items.map((item) => this.toDetail(item)));
    return { data, meta: { page, pageSize, total } };
  }

  async getById(id: string) {
    const entity = await this.findOneOrThrow(id);
    return this.toDetail(entity);
  }

  async create(dto: EnterpriseProfileCreateDto, user: CurrentUser) {
    this.ensureManager(user);
    const departmentCode = await this.getPrimaryDepartmentCode(user.userId);
    const entity = this.repository.create({
      title: dto.title,
      category: dto.category,
      description: dto.description ?? null,
      status: dto.status ?? 'draft',
      effectiveDate: dto.effectiveDate ?? null,
      publishedAt: dto.status === 'published' ? new Date() : null,
      departmentCode,
      createdBy: user.userId,
      updatedBy: user.userId,
    });
    const saved = await this.repository.save(entity);
    if (dto.fileIds?.length) await this.bindFiles(saved.id, { fileIds: dto.fileIds }, user);
    return this.getById(saved.id);
  }

  async update(id: string, dto: EnterpriseProfileUpdateDto, user: CurrentUser) {
    this.ensureManager(user);
    const entity = await this.findOneOrThrow(id);
    await this.ensureDepartmentAccess(entity, user);

    Object.assign(entity, {
      title: dto.title ?? entity.title,
      category: dto.category ?? entity.category,
      description: dto.description ?? entity.description,
      status: dto.status ?? entity.status,
      effectiveDate: dto.effectiveDate ?? entity.effectiveDate,
      updatedBy: user.userId,
    });
    if (dto.status === 'published' && !entity.publishedAt) {
      entity.publishedAt = new Date();
    }

    await this.repository.save(entity);
    if (dto.fileIds) {
      await this.fileRelRepository.delete({ enterpriseProfileId: id });
      await this.bindFiles(id, { fileIds: dto.fileIds }, user);
    }
    return this.getById(id);
  }

  async remove(id: string, user: CurrentUser): Promise<void> {
    this.ensureManager(user);
    const entity = await this.findOneOrThrow(id);
    await this.ensureDepartmentAccess(entity, user);
    entity.deletedAt = new Date();
    entity.updatedBy = user.userId;
    await this.repository.save(entity);
  }

  async bindFiles(id: string, dto: EnterpriseProfileBindFilesDto, user: CurrentUser) {
    this.ensureManager(user);
    const entity = await this.findOneOrThrow(id);
    await this.ensureDepartmentAccess(entity, user);

    const files = await this.fileRepository.find({ where: { id: In(dto.fileIds) } });
    if (files.length !== dto.fileIds.length) {
      throw new NotFoundException('file not found');
    }

    const existing = await this.fileRelRepository.find({ where: { enterpriseProfileId: id } });
    const existingSet = new Set(existing.map((row) => row.fileId));
    const rows = dto.fileIds.filter((fileId) => !existingSet.has(fileId)).map((fileId, index) =>
      this.fileRelRepository.create({ enterpriseProfileId: id, fileId, sortOrder: existing.length + index }),
    );
    if (rows.length) await this.fileRelRepository.save(rows);
    return this.getById(id);
  }

  async unbindFile(id: string, fileId: string, user: CurrentUser): Promise<void> {
    this.ensureManager(user);
    const entity = await this.findOneOrThrow(id);
    await this.ensureDepartmentAccess(entity, user);
    await this.fileRelRepository.delete({ enterpriseProfileId: id, fileId });
  }

  async getFileDownloadUrl(id: string, fileId: string) {
    await this.findOneOrThrow(id);
    const relation = await this.fileRelRepository.findOne({
      where: { enterpriseProfileId: id, fileId },
    });
    if (!relation) throw new NotFoundException('enterprise profile file not found');
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) throw new NotFoundException('file not found');
    return this.ossService.createDownloadSignature(file.ossKey);
  }

  private ensureManager(user: CurrentUser) {
    if (user.roles.includes('system_admin')) return;
    if (!user.roles.some((role) => MANAGER_ROLES.has(role))) {
      throw new ForbiddenException('forbidden');
    }
  }

  private async ensureDepartmentAccess(entity: EnterpriseProfileEntity, user: CurrentUser) {
    if (user.roles.includes('system_admin')) return;
    const dept = await this.getPrimaryDepartmentCode(user.userId);
    if (!dept || entity.departmentCode !== dept) {
      throw new ForbiddenException('department scope denied');
    }
  }

  private async getPrimaryDepartmentCode(userId: string): Promise<string | null> {
    const user = await this.wecomUserRepository.findOne({ where: { userId } });
    return user?.departmentCodes?.[0] ?? null;
  }

  private async findOneOrThrow(id: string) {
    const entity = await this.repository.findOne({ where: { id, deletedAt: IsNull() } });
    if (!entity) throw new NotFoundException('enterprise profile not found');
    return entity;
  }

  private async toDetail(entity: EnterpriseProfileEntity) {
    const rels = await this.fileRelRepository.find({ where: { enterpriseProfileId: entity.id }, order: { sortOrder: 'ASC' } });
    const fileIds = rels.map((item) => item.fileId);
    const files = fileIds.length ? await this.fileRepository.find({ where: { id: In(fileIds) } }) : [];
    const byId = new Map(files.map((file) => [file.id, file]));

    return {
      id: entity.id,
      title: entity.title,
      category: entity.category,
      description: entity.description,
      status: entity.status,
      effectiveDate: entity.effectiveDate,
      publishedAt: entity.publishedAt?.toISOString() ?? null,
      files: fileIds.map((id) => byId.get(id)).filter((f): f is FileEntity => Boolean(f)).map((file) => ({
        id: file.id,
        fileName: file.fileName,
        ossKey: file.ossKey,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
      })),
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
