import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, IsNull, Repository } from 'typeorm';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { OfficeCategoryEntity } from 'src/database/entities/office-category.entity';
import { OfficeEntryAuditEntity } from 'src/database/entities/office-entry-audit.entity';
import { OfficeEntryEntity } from 'src/database/entities/office-entry.entity';
import { OfficeAdminEntryListQueryDto } from './dto/office-admin-entry-list-query.dto';
import { OfficeAuditListQueryDto } from './dto/office-audit-list-query.dto';
import { OfficeEntryCreateDto } from './dto/office-entry-create.dto';
import { OfficeEntryListQueryDto } from './dto/office-entry-list-query.dto';
import { OfficeEntryUpdateDto } from './dto/office-entry-update.dto';
import { OFFICE_CATEGORY_DEFINITIONS, OFFICE_INTERNAL_ROUTE_PREFIXES } from './office.constants';

@Injectable()
export class OfficeService {
  constructor(
    @InjectRepository(OfficeCategoryEntity)
    private readonly categoryRepository: Repository<OfficeCategoryEntity>,
    @InjectRepository(OfficeEntryEntity)
    private readonly entryRepository: Repository<OfficeEntryEntity>,
    @InjectRepository(OfficeEntryAuditEntity)
    private readonly auditRepository: Repository<OfficeEntryAuditEntity>,
  ) {}

  async listCategories(user: CurrentUser) {
    const categories = await this.categoryRepository.find({ where: { isEnabled: true }, order: { sortOrder: 'ASC', name: 'ASC' } });
    const manageable = new Set<string>(this.getManageableCategoryCodes(user));
    return categories.map((category) => ({
      code: category.code,
      name: category.name,
      sortOrder: category.sortOrder,
      isEnabled: category.isEnabled,
      canManage: user.roles.includes('system_admin') || manageable.has(category.code),
    }));
  }

  async listEntries(query: OfficeEntryListQueryDto, user: CurrentUser) {
    const qb = this.entryRepository
      .createQueryBuilder('entry')
      .innerJoin(OfficeCategoryEntity, 'category', 'category.code = entry.categoryCode AND category.isEnabled = true')
      .where('entry.deletedAt IS NULL')
      .andWhere('entry.status = :status', { status: 'published' });

    this.applyKeywordAndCategoryFilters(qb, query.keyword, query.categoryCode);
    this.applyVisibilityFilter(qb, user);

    const rows = await qb.orderBy('category.sortOrder', 'ASC').addOrderBy('entry.sortOrder', 'ASC').addOrderBy('entry.createdAt', 'DESC').getMany();
    return rows.map((row) => this.toEntryDto(row));
  }

  async getEntry(id: string, user: CurrentUser) {
    const entity = await this.entryRepository.findOne({ where: { id, deletedAt: IsNull() } });
    if (!entity) throw new NotFoundException('office entry not found');
    if (entity.status !== 'published' || !this.canViewEntry(user, entity)) {
      throw new NotFoundException('office entry not found');
    }
    return this.toEntryDto(entity);
  }

  async openEntry(id: string, user: CurrentUser) {
    const entity = await this.entryRepository.findOne({ where: { id, deletedAt: IsNull() } });
    if (!entity) throw new NotFoundException('office entry not found');
    if (entity.status !== 'published' || !this.canViewEntry(user, entity)) {
      throw new NotFoundException('office entry not found');
    }

    await this.writeAudit(entity.id, 'open', user.userId, {
      targetType: entity.targetType,
      targetValue: entity.targetValue,
      openMode: entity.openMode,
    });

    return {
      id: entity.id,
      title: entity.title,
      targetType: entity.targetType,
      targetValue: entity.targetValue,
      openMode: entity.openMode,
    };
  }

  async listAdminEntries(query: OfficeAdminEntryListQueryDto, user: CurrentUser) {
    this.ensureAdminEntryAccess(user);
    const qb = this.entryRepository.createQueryBuilder('entry').where('entry.deletedAt IS NULL');

    this.applyKeywordAndCategoryFilters(qb, query.keyword, query.categoryCode);
    if (query.status) {
      qb.andWhere('entry.status = :status', { status: query.status });
    }
    this.applyManagementFilter(qb, user);

    const rows = await qb.orderBy('entry.sortOrder', 'ASC').addOrderBy('entry.createdAt', 'DESC').getMany();
    return rows.map((row) => this.toAdminEntryDto(row, user));
  }

  async listAudits(query: OfficeAuditListQueryDto, user: CurrentUser) {
    this.ensureAdminEntryAccess(user);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: {
      entryId?: string;
      action?: 'create' | 'update' | 'publish' | 'disable' | 'open';
      operatorUserId?: string;
    } = {};

    if (query.entryId) where.entryId = query.entryId;
    if (query.action) where.action = query.action;
    if (query.operatorUserId) where.operatorUserId = query.operatorUserId;

    const [audits, total] = await this.auditRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: pageSize,
    });

    const manageable = new Set(this.getManageableCategoryCodes(user));
    const entryIds = [...new Set(audits.map((audit) => audit.entryId))];
    const entries = entryIds.length
      ? await this.entryRepository.find({
          where: { id: In(entryIds), deletedAt: IsNull() },
        })
      : [];

    const entryMap = new Map(entries.map((entry) => [entry.id, entry]));
    const isSystemAdmin = user.roles.includes('system_admin');
    const filtered = audits.filter((audit) => {
      const entry = entryMap.get(audit.entryId);
      if (!entry) return false;
      if (isSystemAdmin) return true;
      return manageable.has(entry.categoryCode);
    });

    return {
      data: filtered.map((audit) => {
        const entry = entryMap.get(audit.entryId)!;
        return {
          id: audit.id,
          entryId: audit.entryId,
          entryTitle: entry.title,
          categoryCode: entry.categoryCode,
          action: audit.action,
          operatorUserId: audit.operatorUserId,
          payloadSnapshot: audit.payloadSnapshot,
          createdAt: audit.createdAt.toISOString(),
        };
      }),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async createEntry(dto: OfficeEntryCreateDto, user: CurrentUser) {
    this.assertCanManageCategory(dto.categoryCode, user);
    this.validateTarget(dto.targetType, dto.targetValue);

    const categoryRoles = this.getCategoryManagerRoles(dto.categoryCode);
    const entity = this.entryRepository.create({
      categoryCode: dto.categoryCode,
      title: dto.title.trim(),
      summary: dto.summary.trim(),
      iconType: dto.iconType.trim(),
      targetType: dto.targetType,
      targetValue: dto.targetValue.trim(),
      openMode: dto.openMode ?? 'current_webview',
      visibilityRoles: dto.visibilityRoles,
      managerRoles: dto.managerRoles ?? categoryRoles,
      sortOrder: dto.sortOrder ?? 0,
      status: 'draft',
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    const saved = await this.entryRepository.save(entity);
    await this.writeAudit(saved.id, 'create', user.userId, this.toEntryDto(saved));
    return this.toAdminEntryDto(saved, user);
  }

  async updateEntry(id: string, dto: OfficeEntryUpdateDto, user: CurrentUser) {
    const entity = await this.mustFindManageableEntry(id, user);
    const nextCategoryCode = dto.categoryCode ?? entity.categoryCode;
    this.assertCanManageCategory(nextCategoryCode, user);

    const nextTargetType = dto.targetType ?? entity.targetType;
    const nextTargetValue = dto.targetValue ?? entity.targetValue;
    this.validateTarget(nextTargetType, nextTargetValue);

    Object.assign(entity, {
      categoryCode: nextCategoryCode,
      title: dto.title?.trim() ?? entity.title,
      summary: dto.summary?.trim() ?? entity.summary,
      iconType: dto.iconType?.trim() ?? entity.iconType,
      targetType: nextTargetType,
      targetValue: nextTargetValue.trim(),
      openMode: dto.openMode ?? entity.openMode,
      visibilityRoles: dto.visibilityRoles ?? entity.visibilityRoles,
      managerRoles: dto.managerRoles ?? entity.managerRoles,
      sortOrder: dto.sortOrder ?? entity.sortOrder,
      updatedBy: user.userId,
    });

    const saved = await this.entryRepository.save(entity);
    await this.writeAudit(saved.id, 'update', user.userId, this.toEntryDto(saved));
    return this.toAdminEntryDto(saved, user);
  }

  async publishEntry(id: string, user: CurrentUser) {
    const entity = await this.mustFindManageableEntry(id, user);
    entity.status = 'published';
    entity.updatedBy = user.userId;
    const saved = await this.entryRepository.save(entity);
    await this.writeAudit(saved.id, 'publish', user.userId, { status: saved.status });
    return this.toAdminEntryDto(saved, user);
  }

  async disableEntry(id: string, user: CurrentUser) {
    const entity = await this.mustFindManageableEntry(id, user);
    entity.status = 'disabled';
    entity.updatedBy = user.userId;
    const saved = await this.entryRepository.save(entity);
    await this.writeAudit(saved.id, 'disable', user.userId, { status: saved.status });
    return this.toAdminEntryDto(saved, user);
  }

  private applyKeywordAndCategoryFilters(qb: ReturnType<Repository<OfficeEntryEntity>['createQueryBuilder']>, keyword?: string, categoryCode?: string) {
    if (keyword?.trim()) {
      const normalized = `%${keyword.trim().toLowerCase()}%`;
      qb.andWhere(new Brackets((subQb) => {
        subQb.where('LOWER(entry.title) LIKE :keyword', { keyword: normalized }).orWhere('LOWER(entry.summary) LIKE :keyword', { keyword: normalized });
      }));
    }

    if (categoryCode) {
      qb.andWhere('entry.categoryCode = :categoryCode', { categoryCode });
    }
  }

  private applyVisibilityFilter(qb: ReturnType<Repository<OfficeEntryEntity>['createQueryBuilder']>, user: CurrentUser) {
    if (user.roles.includes('system_admin')) {
      return;
    }

    const roles = [...new Set(user.roles)];
    qb.andWhere(new Brackets((subQb) => {
      subQb.where("entry.visibilityRoles @> :allAuthenticated", { allAuthenticated: JSON.stringify(['all_authenticated']) });
      for (const [index, role] of roles.entries()) {
        subQb.orWhere(`entry.visibilityRoles @> :role${index}`, { [`role${index}`]: JSON.stringify([role]) });
      }
    }));
  }

  private applyManagementFilter(qb: ReturnType<Repository<OfficeEntryEntity>['createQueryBuilder']>, user: CurrentUser) {
    if (user.roles.includes('system_admin')) {
      return;
    }

    const manageableCategoryCodes = this.getManageableCategoryCodes(user);
    if (!manageableCategoryCodes.length) {
      qb.andWhere('1 = 0');
      return;
    }

    qb.andWhere('entry.categoryCode IN (:...categoryCodes)', { categoryCodes: manageableCategoryCodes });
  }

  private ensureAdminEntryAccess(user: CurrentUser) {
    if (user.roles.includes('system_admin') || this.getManageableCategoryCodes(user).length > 0) {
      return;
    }
    throw new ForbiddenException('forbidden');
  }

  private getManageableCategoryCodes(user: CurrentUser) {
    if (user.roles.includes('system_admin')) {
      return OFFICE_CATEGORY_DEFINITIONS.map((category) => category.code) as string[];
    }

    const roleSet = new Set(user.roles);
    return OFFICE_CATEGORY_DEFINITIONS
      .filter((category) => category.managerRoles.some((role) => roleSet.has(role)))
      .map((category) => category.code) as string[];
  }

  private getCategoryManagerRoles(categoryCode: string) {
    const category = OFFICE_CATEGORY_DEFINITIONS.find((item) => item.code === categoryCode);
    if (!category) {
      throw new BadRequestException('invalid office category');
    }
    return [...category.managerRoles];
  }

  private assertCanManageCategory(categoryCode: string, user: CurrentUser) {
    if (user.roles.includes('system_admin')) {
      return;
    }

    const manageable = this.getManageableCategoryCodes(user);
    if (!manageable.includes(categoryCode)) {
      throw new ForbiddenException('forbidden');
    }
  }

  private canViewEntry(user: CurrentUser, entity: OfficeEntryEntity) {
    if (user.roles.includes('system_admin')) {
      return true;
    }
    const roleSet = new Set(user.roles);
    return entity.visibilityRoles.some((role) => roleSet.has(role));
  }

  private async mustFindManageableEntry(id: string, user: CurrentUser) {
    const entity = await this.entryRepository.findOne({ where: { id, deletedAt: IsNull() } });
    if (!entity) throw new NotFoundException('office entry not found');
    this.assertCanManageCategory(entity.categoryCode, user);
    return entity;
  }

  private validateTarget(targetType: 'external_url' | 'internal_route', targetValue: string) {
    const normalized = targetValue.trim();
    if (!normalized) {
      throw new BadRequestException('target value is required');
    }

    if (targetType === 'external_url') {
      let parsed: URL;
      try {
        parsed = new URL(normalized);
      } catch {
        throw new BadRequestException('invalid external target url');
      }

      if (parsed.protocol !== 'https:') {
        throw new BadRequestException('external target must use https');
      }

      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(parsed.hostname)) {
        throw new BadRequestException('external target must not use a bare ip address');
      }

      return;
    }

    if (!normalized.startsWith('/') || normalized.startsWith('//')) {
      throw new BadRequestException('internal route must start with an allowed prefix');
    }

    if (!OFFICE_INTERNAL_ROUTE_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`) || normalized.startsWith(`${prefix}?`))) {
      throw new BadRequestException('internal route is not in the allow list');
    }
  }

  private async writeAudit(entryId: string, action: 'create' | 'update' | 'publish' | 'disable' | 'open', operatorUserId: string, payloadSnapshot: Record<string, unknown>) {
    await this.auditRepository.save(this.auditRepository.create({ entryId, action, operatorUserId, payloadSnapshot }));
  }

  private toEntryDto(entity: OfficeEntryEntity) {
    return {
      id: entity.id,
      categoryCode: entity.categoryCode,
      title: entity.title,
      summary: entity.summary,
      iconType: entity.iconType,
      targetType: entity.targetType,
      targetValue: entity.targetValue,
      openMode: entity.openMode,
      visibilityRoles: entity.visibilityRoles,
      managerRoles: entity.managerRoles,
      sortOrder: entity.sortOrder,
      status: entity.status,
    };
  }

  private toAdminEntryDto(entity: OfficeEntryEntity, user: CurrentUser) {
    return {
      ...this.toEntryDto(entity),
      canManage: user.roles.includes('system_admin') || this.getManageableCategoryCodes(user).includes(entity.categoryCode),
      createdBy: entity.createdBy,
      updatedBy: entity.updatedBy,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
