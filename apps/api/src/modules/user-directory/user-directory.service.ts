import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';

import { appEnv } from 'src/config/env';
import { WecomDepartmentEntity } from 'src/database/entities/wecom-department.entity';
import { WecomSyncBatchEntity } from 'src/database/entities/wecom-sync-batch.entity';
import { WecomUserAuditEntity } from 'src/database/entities/wecom-user-audit.entity';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import {
  BUSINESS_ROLES,
  AuthorizationService,
} from 'src/modules/auth/authorization.service';
import { RoleResolverService } from 'src/modules/auth/role-resolver.service';
import { WecomAdminService } from 'src/modules/wecom/wecom-admin.service';
import { WecomHttpGateway } from 'src/modules/wecom/wecom-http.gateway';
import { WecomTokenService } from 'src/modules/wecom/wecom-token.service';
import type { WecomDepartment, WecomUserListItem } from 'src/modules/wecom/wecom.types';
import type {
  AdminUserAuditQueryDto,
  AdminUserListQueryDto,
  UpdateAdminUserDto,
} from 'src/modules/user-directory/dto/admin-user.dto';

@Injectable()
export class UserDirectoryService {
  constructor(
    @InjectRepository(WecomUserEntity)
    private readonly userRepository: Repository<WecomUserEntity>,
    @InjectRepository(WecomDepartmentEntity)
    private readonly departmentRepository: Repository<WecomDepartmentEntity>,
    @InjectRepository(WecomSyncBatchEntity)
    private readonly syncBatchRepository: Repository<WecomSyncBatchEntity>,
    @InjectRepository(WecomUserAuditEntity)
    private readonly auditRepository: Repository<WecomUserAuditEntity>,
    private readonly authorizationService: AuthorizationService,
    private readonly roleResolver: RoleResolverService,
    private readonly wecomHttpGateway: WecomHttpGateway,
    private readonly tokenService: WecomTokenService,
    private readonly adminService: WecomAdminService,
  ) {}

  async listUsers(query: AdminUserListQueryDto) {
    const users = await this.userRepository.find({
      where: { corpId: appEnv.WECOM_CORP_ID },
      order: { name: 'ASC', userId: 'ASC' },
    });
    const normalizedSearch = query.search?.trim().toLowerCase();
    const filtered = users.filter((user) => {
      const effective = this.authorizationService.getEffectiveAuthorization(user, {
        ignoreAvailability: true,
      });
      const hasOverrides = user.departmentMode === 'manual' || user.roleMode === 'manual';
      if (
        normalizedSearch &&
        !user.userId.toLowerCase().includes(normalizedSearch) &&
        !user.name.toLowerCase().includes(normalizedSearch)
      ) {
        return false;
      }
      if (query.departmentId !== undefined && !effective.departmentIds.includes(query.departmentId)) {
        return false;
      }
      if (query.role && !effective.roles.includes(query.role)) {
        return false;
      }
      if (query.platformStatus && user.platformStatus !== query.platformStatus) {
        return false;
      }
      if (query.isSystemAdmin !== undefined && effective.isAdmin !== query.isSystemAdmin) {
        return false;
      }
      if (
        query.hasLoggedIn !== undefined &&
        (query.hasLoggedIn ? user.loginStatus === 'logged_in' : user.loginStatus === 'never') !==
          query.hasLoggedIn
      ) {
        return false;
      }
      if (query.hasOverrides !== undefined && hasOverrides !== query.hasOverrides) {
        return false;
      }
      return true;
    });
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const items = filtered
      .slice((page - 1) * pageSize, page * pageSize)
      .map((user) => this.serializeUser(user));
    return {
      items,
      total: filtered.length,
      page,
      pageSize,
      scope: {
        corpId: appEnv.WECOM_CORP_ID,
        coverageStatus: 'unverified',
        coverageNote: '用户范围受主应用企业微信可见范围限制，完整性未验证',
      },
    };
  }

  async getUser(userId: string) {
    const user = await this.userRepository.findOne({
      where: { userId, corpId: appEnv.WECOM_CORP_ID },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    const audits = await this.auditRepository.find({
      where: { userId: user.userId, corpId: user.corpId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    return {
      ...this.serializeUser(user),
      audits: audits.map((audit) => this.serializeAudit(audit)),
    };
  }

  async listAudits(userId: string, query: AdminUserAuditQueryDto) {
    const user = await this.userRepository.findOne({
      where: { userId, corpId: appEnv.WECOM_CORP_ID },
      select: ['userId', 'corpId'],
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [audits, total] = await this.auditRepository.findAndCount({
      where: { userId, corpId: appEnv.WECOM_CORP_ID },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items: audits.map((audit) => this.serializeAudit(audit)), total, page, pageSize };
  }

  async updateUser(userId: string, dto: UpdateAdminUserDto, actorUserId: string) {
    const saved = await this.userRepository.manager.transaction(async (manager) => {
      const user = await this.authorizationService.lockUser(manager, userId);
      const currentVersion = Number(user.authorizationVersion ?? 1);
      if (currentVersion !== dto.expectedAuthorizationVersion) {
        throw new ConflictException({
          message: '用户授权版本已变化，请重新读取后再保存',
          currentAuthorizationVersion: currentVersion,
        });
      }

      const nextDepartmentMode = dto.departmentMode ?? user.departmentMode;
      const nextRoleMode = dto.roleMode ?? user.roleMode;
      const nextDepartmentIds = this.normalizeDepartmentIds(
        dto.manualDepartmentIds ?? user.manualDepartmentIds ?? [],
      );
      const nextRoles = this.normalizeRoles(dto.manualRoles ?? user.manualRoles ?? []);
      if (nextDepartmentMode === 'manual') {
        const departments = await this.departmentRepository.find({
          where: {
            corpId: appEnv.WECOM_CORP_ID,
            departmentId: In(nextDepartmentIds),
          },
        });
        if (departments.length !== nextDepartmentIds.length) {
          throw new BadRequestException('人工部门必须来自已同步的企业微信部门字典');
        }
      }
      if (nextRoleMode === 'manual' && nextRoles.some((role) => !BUSINESS_ROLES.includes(role as never))) {
        throw new BadRequestException('包含不支持的业务角色');
      }
      if (dto.platformStatus === 'disabled' && this.adminService.isSystemAdmin(user.userId)) {
        throw new BadRequestException('env 管理员不能被平台停用');
      }

      const before = this.authorizationSnapshot(user);
      const changedPlatformStatus =
        dto.platformStatus !== undefined && dto.platformStatus !== user.platformStatus;
      await manager.update(WecomUserEntity, { id: user.id }, {
        departmentMode: nextDepartmentMode,
        manualDepartmentIds: nextDepartmentIds,
        roleMode: nextRoleMode,
        manualRoles: nextRoles,
        ...(dto.platformStatus === undefined ? {} : { platformStatus: dto.platformStatus }),
        ...(changedPlatformStatus
          ? {
              platformStatusReason: dto.reason.trim(),
              platformStatusChangedAt: new Date(),
            }
          : {}),
        authorizationVersion: currentVersion + 1,
      });
      const updated = await manager.findOneOrFail(WecomUserEntity, {
        where: { id: user.id },
      });
      await manager.save(
        WecomUserAuditEntity,
        manager.create(WecomUserAuditEntity, {
          userId: updated.userId,
          corpId: updated.corpId,
          actorUserId,
          source: 'admin',
          action: 'update_authorization',
          reason: dto.reason.trim(),
          beforeSnapshot: before,
          afterSnapshot: this.authorizationSnapshot(updated),
          authorizationVersion: Number(updated.authorizationVersion),
        }),
      );
      return updated;
    });
    return this.getUser(saved.userId);
  }

  async startSync(actorUserId: string) {
    const running = await this.syncBatchRepository.findOne({
      where: { corpId: appEnv.WECOM_CORP_ID, status: 'running' },
      order: { createdAt: 'DESC' },
    });
    if (running) {
      throw new ConflictException({ message: '通讯录同步正在进行中', batchId: running.id });
    }

    let batch: WecomSyncBatchEntity;
    try {
      batch = await this.syncBatchRepository.save(
        this.syncBatchRepository.create({
          corpId: appEnv.WECOM_CORP_ID,
          triggeredBy: actorUserId,
          sourceRevision: await this.authorizationService.nextSourceRevision(),
          status: 'running',
          coverageStatus: 'unverified',
          coverageNote: '当前仅覆盖主应用可见范围，完整性未验证',
          startedAt: new Date(),
          finishedAt: null,
          readCount: 0,
          createdCount: 0,
          updatedCount: 0,
          failedCount: 0,
          errorSummary: [],
        }),
      );
    } catch (error) {
      const driverError = error instanceof QueryFailedError ? error.driverError as unknown : null;
      const code =
        typeof driverError === 'object' && driverError !== null && 'code' in driverError
          ? driverError.code
          : undefined;
      if (code === '23505') {
        throw new ConflictException('通讯录同步正在进行中');
      }
      throw error;
    }

    const errors: Array<{ scope: string; message: string }> = [];
    const seenUsers = new Map<string, WecomUserListItem>();
    let departmentCount = 0;
    try {
      const accessToken = await this.tokenService.getAccessToken();
      const departmentResponse = await this.withRetry(() =>
        this.wecomHttpGateway.listDepartments(accessToken),
      );
      const departments = this.dedupeDepartments(departmentResponse.department ?? []);
      departmentCount = departments.length;
      await this.upsertDepartments(departments, batch.id, batch.sourceRevision);
      if (departments.length === 0) {
        departments.push({ id: 1, name: '公司成员' });
      }
      for (const department of departments) {
        try {
          let cursor: string | undefined;
          const cursors = new Set<string>();
          do {
            if (cursor && cursors.has(cursor)) {
              throw new Error(`企业微信成员分页游标重复: ${cursor}`);
            }
            if (cursor) cursors.add(cursor);
            const response = await this.withRetry(() =>
              this.wecomHttpGateway.listUsers(accessToken, department.id, 0, cursor),
            );
            for (const member of response.userlist ?? []) {
              if (member.userid) seenUsers.set(member.userid, member);
            }
            cursor = response.next_cursor?.trim() || undefined;
          } while (cursor);
        } catch (error) {
          errors.push({ scope: `department:${department.id}`, message: this.errorMessage(error) });
        }
      }

      let createdCount = 0;
      let updatedCount = 0;
      for (const member of seenUsers.values()) {
        try {
          const result = await this.authorizationService.applySourceProfile({
            userId: member.userid,
            corpId: appEnv.WECOM_CORP_ID,
            name: member.name,
            avatarUrl: member.avatar ?? null,
            departmentIds: this.roleResolver.normalizeDepartmentIds(member.department ?? []),
            departmentNames: this.departmentNames(member.department ?? [], departments),
            departmentCodes: this.roleResolver.resolveDepartmentCodes({
              departmentIds: member.department ?? [],
              departmentNames: this.departmentNames(member.department ?? [], departments),
            }),
            position: member.position ?? null,
            rawProfile: member as unknown as Record<string, unknown>,
            sourceStatus: this.resolveSourceStatus(member),
            sourceStatusUpdatedAt: new Date(),
            sourceBatchId: batch.id,
            sourceRevision: batch.sourceRevision,
          });
          if (result.created) createdCount += 1;
          else if (!result.ignored) updatedCount += 1;
        } catch (error) {
          errors.push({ scope: `user:${member.userid}`, message: this.errorMessage(error) });
        }
      }

      const status = errors.length ? 'partial' : 'succeeded';
      await this.syncBatchRepository.update(batch.id, {
        status,
        finishedAt: new Date(),
        readCount: seenUsers.size,
        createdCount,
        updatedCount,
        failedCount: errors.length,
        errorSummary: errors.slice(0, 100),
        coverageStatus: 'unverified',
        coverageNote:
          departmentCount > 0
            ? '当前仅覆盖主应用可见范围，完整性未验证；名单缺失不视为离职'
            : '未能读取部门范围，未改变现有用户状态',
      });
    } catch (error) {
      errors.push({ scope: 'sync', message: this.errorMessage(error) });
      await this.syncBatchRepository.update(batch.id, {
        status: 'failed',
        finishedAt: new Date(),
        failedCount: errors.length,
        errorSummary: errors.slice(0, 100),
        coverageStatus: 'unverified',
        coverageNote: '通讯录读取失败，未因名单缺失改变现有用户状态',
      });
    }
    return this.getSyncBatch(batch.id);
  }

  async getSyncBatch(batchId: string) {
    const batch = await this.syncBatchRepository.findOne({
      where: { id: batchId, corpId: appEnv.WECOM_CORP_ID },
    });
    if (!batch) throw new NotFoundException('同步批次不存在');
    return batch;
  }

  private async upsertDepartments(
    departments: WecomDepartment[],
    batchId: string,
    sourceRevision: number,
  ): Promise<void> {
    await this.departmentRepository.manager.transaction(async (manager) => {
      for (const department of departments) {
        const existing = await manager.findOne(WecomDepartmentEntity, {
          where: { corpId: appEnv.WECOM_CORP_ID, departmentId: department.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (existing && Number(existing.sourceRevision) > sourceRevision) continue;
        const values = {
          corpId: appEnv.WECOM_CORP_ID,
          departmentId: department.id,
          parentId: department.parentid ?? null,
          name: department.name,
          sourceRevision,
          lastSyncBatchId: batchId,
        };
        if (existing) await manager.update(WecomDepartmentEntity, { id: existing.id }, values);
        else await manager.save(WecomDepartmentEntity, manager.create(WecomDepartmentEntity, values));
      }
    });
  }

  private dedupeDepartments(departments: WecomDepartment[]): WecomDepartment[] {
    return [...new Map(departments.filter((department) => department.id > 0).map((department) => [department.id, department])).values()];
  }

  private departmentNames(ids: number[], departments: WecomDepartment[]): string[] {
    const names = new Map(departments.map((department) => [department.id, department.name]));
    return this.roleResolver.normalizeDepartmentIds(ids).map((id) => names.get(id) ?? this.roleResolver.resolveFallbackDepartmentName(id));
  }

  private resolveSourceStatus(member: WecomUserListItem): 'active' | 'inactive' | 'unknown' {
    const status = member.status ?? member.enable;
    if (status === undefined) return 'unknown';
    return status === 1 ? 'active' : 'inactive';
  }

  private normalizeDepartmentIds(ids: number[]): number[] {
    return this.roleResolver.normalizeDepartmentIds(ids);
  }

  private normalizeRoles(roles: string[]): string[] {
    return this.authorizationService.normalizeBusinessRoles(roles);
  }

  private serializeUser(user: WecomUserEntity) {
    const effective = this.authorizationService.getEffectiveAuthorization(user, {
      ignoreAvailability: true,
    });
    return {
      userId: user.userId,
      name: user.name,
      avatar: user.avatarUrl,
      corpId: user.corpId,
      source: {
        status: user.sourceStatus,
        departmentIds: user.departmentIds ?? [],
        departments: user.departmentNames ?? [],
        position: user.position,
        lastLoginAt: user.lastLoginAt,
        loginStatus: user.loginStatus,
        lastSyncAt: user.lastSyncAt,
        sourceRevision: Number(user.sourceRevision ?? 0),
      },
      platform: {
        status: user.platformStatus,
        statusReason: user.platformStatusReason,
        departmentMode: user.departmentMode,
        manualDepartmentIds: user.manualDepartmentIds ?? [],
        roleMode: user.roleMode,
        manualRoles: user.manualRoles ?? [],
        authorizationVersion: Number(user.authorizationVersion ?? 1),
      },
      effective: {
        departmentIds: effective.departmentIds,
        departments: effective.departments,
        roles: effective.roles,
        isSystemAdmin: effective.isAdmin,
        available:
          user.sourceStatus !== 'inactive' &&
          (effective.isAdmin || user.platformStatus !== 'disabled'),
      },
    };
  }

  private authorizationSnapshot(user: WecomUserEntity): Record<string, unknown> {
    return {
      departmentMode: user.departmentMode,
      manualDepartmentIds: user.manualDepartmentIds ?? [],
      roleMode: user.roleMode,
      manualRoles: user.manualRoles ?? [],
      platformStatus: user.platformStatus,
      platformStatusReason: user.platformStatusReason,
      authorizationVersion: Number(user.authorizationVersion ?? 1),
    };
  }

  private serializeAudit(audit: WecomUserAuditEntity) {
    return {
      id: audit.id,
      actorUserId: audit.actorUserId,
      source: audit.source,
      action: audit.action,
      reason: audit.reason,
      before: audit.beforeSnapshot,
      after: audit.afterSnapshot,
      authorizationVersion:
        audit.authorizationVersion === null ? null : Number(audit.authorizationVersion),
      createdAt: audit.createdAt,
    };
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message.slice(0, 240);
    return '未知企业微信同步错误';
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }
}
