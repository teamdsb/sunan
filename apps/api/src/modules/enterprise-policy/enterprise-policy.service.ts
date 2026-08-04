import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { EnterprisePolicyEntity } from 'src/database/entities/enterprise-policy.entity';
import { EnterprisePolicyFileEntity } from 'src/database/entities/enterprise-policy-file.entity';
import { FileEntity } from 'src/database/entities/file.entity';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { EnterprisePolicyBindFilesDto } from './dto/enterprise-policy-bind-files.dto';
import { EnterprisePolicyCreateDto } from './dto/enterprise-policy-create.dto';
import { EnterprisePolicyListQueryDto } from './dto/enterprise-policy-list-query.dto';
import { EnterprisePolicyUpdateDto } from './dto/enterprise-policy-update.dto';
import { OssService } from 'src/modules/files/oss.service';

const MANAGER_ROLES = new Set(['general_office', 'finance', 'business', 'shipping', 'logistics']);

@Injectable()
export class EnterprisePolicyService {
  constructor(
    @InjectRepository(EnterprisePolicyEntity)
    private readonly repository: Repository<EnterprisePolicyEntity>,
    @InjectRepository(EnterprisePolicyFileEntity)
    private readonly fileRelRepository: Repository<EnterprisePolicyFileEntity>,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    @InjectRepository(WecomUserEntity)
    private readonly wecomUserRepository: Repository<WecomUserEntity>,
    private readonly ossService: OssService,
  ) {}

  async list(query: EnterprisePolicyListQueryDto, user: CurrentUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const qb = this.repository.createQueryBuilder('p').where('p.deletedAt IS NULL');

    if (query.status) qb.andWhere('p.status = :status', { status: query.status });
    if (query.keyword) qb.andWhere('(p.title like :kw OR p.policyCode like :kw)', { kw: `%${query.keyword}%` });
    if (!user.roles.includes('system_admin')) qb.andWhere('p.status != :deprecated', { deprecated: 'deprecated' });

    const [items, total] = await qb.orderBy('p.updatedAt', 'DESC').skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    const data = await Promise.all(items.map((item) => this.toDetail(item)));
    return { data, meta: { page, pageSize, total } };
  }

  async getById(id: string) {
    const entity = await this.findOneOrThrow(id);
    return this.toDetail(entity);
  }

  async create(dto: EnterprisePolicyCreateDto, user: CurrentUser) {
    this.ensureManager(user);
    const departmentCode = await this.getPrimaryDepartmentCode(user.userId);
    const entity = this.repository.create({
      title: dto.title,
      policyCode: dto.policyCode,
      version: dto.version,
      summary: dto.summary ?? null,
      status: dto.status ?? 'draft',
      effectiveDate: dto.effectiveDate ?? null,
      publishedAt: dto.status === 'published' ? new Date() : null,
      departmentCode,
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    if (entity.status === 'published') {
      await this.repository
        .createQueryBuilder()
        .update(EnterprisePolicyEntity)
        .set({ status: 'deprecated' })
        .where('policy_code = :policyCode AND status = :published AND deleted_at IS NULL', { policyCode: entity.policyCode, published: 'published' })
        .execute();
    }

    const saved = await this.repository.save(entity);
    if (dto.fileIds?.length) await this.bindFiles(saved.id, { fileIds: dto.fileIds }, user);
    return this.getById(saved.id);
  }

  async update(id: string, dto: EnterprisePolicyUpdateDto, user: CurrentUser) {
    this.ensureManager(user);
    const entity = await this.findOneOrThrow(id);
    await this.ensureDepartmentAccess(entity, user);

    if (entity.status === 'published' && dto.status !== 'deprecated') {
      throw new ForbiddenException('published policy is readonly');
    }

    Object.assign(entity, {
      title: dto.title ?? entity.title,
      policyCode: dto.policyCode ?? entity.policyCode,
      version: dto.version ?? entity.version,
      summary: dto.summary ?? entity.summary,
      status: dto.status ?? entity.status,
      effectiveDate: dto.effectiveDate ?? entity.effectiveDate,
      updatedBy: user.userId,
    });
    if (dto.status === 'published') {
      await this.repository
        .createQueryBuilder()
        .update(EnterprisePolicyEntity)
        .set({ status: 'deprecated' })
        .where('policy_code = :policyCode AND id != :id AND status = :published AND deleted_at IS NULL', {
          policyCode: entity.policyCode,
          id,
          published: 'published',
        })
        .execute();
      entity.publishedAt = new Date();
    }

    await this.repository.save(entity);

    if (dto.fileIds) {
      await this.fileRelRepository.delete({ enterprisePolicyId: id });
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

  async publish(id: string, user: CurrentUser) {
    this.ensureManager(user);
    const entity = await this.findOneOrThrow(id);
    await this.ensureDepartmentAccess(entity, user);

    await this.repository
      .createQueryBuilder()
      .update(EnterprisePolicyEntity)
      .set({ status: 'deprecated' })
      .where('policy_code = :policyCode AND id != :id AND status = :published AND deleted_at IS NULL', {
        policyCode: entity.policyCode,
        id,
        published: 'published',
      })
      .execute();

    entity.status = 'published';
    entity.publishedAt = new Date();
    entity.updatedBy = user.userId;
    await this.repository.save(entity);
    return this.getById(id);
  }

  async versions(id: string) {
    const entity = await this.findOneOrThrow(id);
    const rows = await this.repository.find({ where: { policyCode: entity.policyCode, deletedAt: IsNull() }, order: { createdAt: 'DESC' } });
    return rows.map((row) => ({
      id: row.id,
      version: row.version,
      status: row.status,
      effectiveDate: row.effectiveDate,
      publishedAt: row.publishedAt?.toISOString() ?? null,
    }));
  }

  async bindFiles(id: string, dto: EnterprisePolicyBindFilesDto, user: CurrentUser) {
    this.ensureManager(user);
    const entity = await this.findOneOrThrow(id);
    await this.ensureDepartmentAccess(entity, user);

    const files = await this.fileRepository.find({ where: { id: In(dto.fileIds) } });
    if (files.length !== dto.fileIds.length) throw new NotFoundException('file not found');

    const existing = await this.fileRelRepository.find({ where: { enterprisePolicyId: id } });
    const existingSet = new Set(existing.map((row) => row.fileId));
    const rows = dto.fileIds.filter((fileId) => !existingSet.has(fileId)).map((fileId, index) =>
      this.fileRelRepository.create({ enterprisePolicyId: id, fileId, sortOrder: existing.length + index }),
    );
    if (rows.length) await this.fileRelRepository.save(rows);
    return this.getById(id);
  }

  async getFileDownloadUrl(id: string, fileId: string) {
    await this.findOneOrThrow(id);
    const relation = await this.fileRelRepository.findOne({
      where: { enterprisePolicyId: id, fileId },
    });
    if (!relation) throw new NotFoundException('enterprise policy file not found');
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

  private async ensureDepartmentAccess(entity: EnterprisePolicyEntity, user: CurrentUser) {
    if (user.roles.includes('system_admin')) return;
    const dept = await this.getPrimaryDepartmentCode(user.userId);
    if (!dept || entity.departmentCode !== dept) throw new ForbiddenException('department scope denied');
  }

  private async getPrimaryDepartmentCode(userId: string): Promise<string | null> {
    const user = await this.wecomUserRepository.findOne({ where: { userId } });
    return user?.departmentCodes?.[0] ?? null;
  }

  private async findOneOrThrow(id: string) {
    const entity = await this.repository.findOne({ where: { id, deletedAt: IsNull() } });
    if (!entity) throw new NotFoundException('enterprise policy not found');
    return entity;
  }

  private async toDetail(entity: EnterprisePolicyEntity) {
    const rels = await this.fileRelRepository.find({ where: { enterprisePolicyId: entity.id }, order: { sortOrder: 'ASC' } });
    const fileIds = rels.map((item) => item.fileId);
    const files = fileIds.length ? await this.fileRepository.find({ where: { id: In(fileIds) } }) : [];
    const byId = new Map(files.map((file) => [file.id, file]));

    return {
      id: entity.id,
      title: entity.title,
      policyCode: entity.policyCode,
      version: entity.version,
      summary: entity.summary,
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
