import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import type { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { appEnv } from 'src/config/env';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import type { AuthenticatedUserResponse } from 'src/modules/auth/auth.types';
import { RoleResolverService } from 'src/modules/auth/role-resolver.service';
import { WecomAdminService } from 'src/modules/wecom/wecom-admin.service';

export const BUSINESS_ROLES = [
  'general_office',
  'finance',
  'business',
  'shipping',
  'logistics',
  'crew',
] as const;

export type BusinessRole = (typeof BUSINESS_ROLES)[number];

export interface SourceProfileInput {
  userId: string;
  corpId: string;
  name: string;
  avatarUrl: string | null;
  departmentIds: number[];
  departmentNames: string[];
  departmentCodes: string[];
  position: string | null;
  rawProfile: Record<string, unknown>;
  sourceStatus: 'active' | 'inactive' | 'unknown';
  sourceStatusUpdatedAt?: Date | null;
  lastLoginAt?: Date | null;
  loginStatus?: 'unknown' | 'never' | 'logged_in';
  sourceBatchId?: string | null;
  sourceRevision?: number;
}

export interface EffectiveAuthorization {
  departmentIds: number[];
  departments: string[];
  roles: string[];
  isAdmin: boolean;
}

@Injectable()
export class AuthorizationService {
  constructor(
    @InjectRepository(WecomUserEntity)
    private readonly userRepository: Repository<WecomUserEntity>,
    private readonly dataSource: DataSource,
    private readonly roleResolver: RoleResolverService,
    private readonly adminService: WecomAdminService,
  ) {}

  async nextSourceRevision(): Promise<number> {
    const rawRows = (await this.dataSource.query(
      `SELECT nextval('wecom_source_revision_seq') AS value`,
    )) as unknown;
    if (!Array.isArray(rawRows)) return Date.now();
    const rows = rawRows as unknown[];
    const first = rows[0];
    const value =
      typeof first === 'object' && first !== null && 'value' in first
        ? (first as { value?: string | number }).value
        : undefined;
    return Number(value ?? Date.now());
  }

  async applySourceProfile(input: SourceProfileInput): Promise<{
    user: WecomUserEntity;
    created: boolean;
    ignored: boolean;
  }> {
    const revision = input.sourceRevision ?? (await this.nextSourceRevision());
    return this.userRepository.manager.transaction(async (manager) => {
      const existing = await manager.findOne(WecomUserEntity, {
        where: { userId: input.userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (existing && existing.corpId !== input.corpId) {
        throw new UnauthorizedException('用户不属于当前企业');
      }

      if (existing && Number(existing.sourceRevision ?? 0) > revision) {
        return { user: existing, created: false, ignored: true };
      }

      const sourceFields = {
        userId: input.userId,
        corpId: input.corpId,
        name: input.name,
        avatarUrl: input.avatarUrl,
        departmentIds: input.departmentIds,
        departmentNames: input.departmentNames,
        departmentCodes: input.departmentCodes,
        position: input.position,
        rawProfile: input.rawProfile,
        sourceStatus:
          input.sourceStatus === 'unknown'
            ? existing?.sourceStatus ?? 'unknown'
            : input.sourceStatus,
        sourceStatusUpdatedAt:
          input.sourceStatus === 'unknown'
            ? existing?.sourceStatusUpdatedAt ?? null
            : input.sourceStatusUpdatedAt ?? new Date(),
        lastLoginAt: input.lastLoginAt ?? existing?.lastLoginAt ?? null,
        loginStatus:
          input.loginStatus ??
          (input.lastLoginAt
            ? 'logged_in'
            : existing?.loginStatus ?? (existing ? 'unknown' : 'never')),
        lastSyncAt: input.sourceBatchId ? new Date() : existing?.lastSyncAt ?? null,
        sourceRevision: revision,
        sourceBatchId: input.sourceBatchId ?? existing?.sourceBatchId ?? null,
        isSystemAdmin: this.adminService.isSystemAdmin(input.userId),
      } satisfies Partial<WecomUserEntity>;

      if (!existing) {
        const created = manager.create(WecomUserEntity, {
          ...sourceFields,
          platformStatus: 'enabled',
          platformStatusReason: null,
          platformStatusChangedAt: null,
          departmentMode: 'follow_wecom',
          manualDepartmentIds: [],
          roleMode: 'auto',
          manualRoles: [],
          authorizationVersion: 1,
        });
        return {
          user: await manager.save(WecomUserEntity, created),
          created: true,
          ignored: false,
        };
      }

      await manager.update(WecomUserEntity, { id: existing.id }, sourceFields as never);
      const user = await manager.findOneOrFail(WecomUserEntity, {
        where: { id: existing.id },
      });
      return { user, created: false, ignored: false };
    });
  }

  assertCurrentCorp(user: Pick<WecomUserEntity, 'corpId'>): void {
    if (user.corpId !== appEnv.WECOM_CORP_ID) {
      throw new UnauthorizedException('用户不属于当前企业');
    }
  }

  getEffectiveAuthorization(
    user: WecomUserEntity,
    options: { ignoreAvailability?: boolean } = {},
  ): EffectiveAuthorization {
    this.assertCurrentCorp(user);
    const isAdmin = this.adminService.isSystemAdmin(user.userId);

    if (!options.ignoreAvailability && user.sourceStatus === 'inactive') {
      throw new ForbiddenException('企业微信成员不可用');
    }
    if (!options.ignoreAvailability && !isAdmin && user.platformStatus === 'disabled') {
      throw new ForbiddenException('平台账号已停用');
    }

    const departmentIds = this.roleResolver.normalizeDepartmentIds(
      user.departmentMode === 'manual'
        ? user.manualDepartmentIds ?? []
        : user.departmentIds ?? [],
    );
    const departments =
      user.departmentMode === 'manual'
        ? departmentIds.map((id) => this.roleResolver.resolveFallbackDepartmentName(id))
        : user.departmentNames ?? [];

    const roles = new Set<string>(['all_authenticated']);
    if (user.roleMode === 'manual') {
      for (const role of this.normalizeBusinessRoles(user.manualRoles ?? [])) {
        roles.add(role);
      }
    } else {
      for (const role of this.roleResolver.resolveRoles({
        departmentIds,
        departmentNames: departments,
        position: user.position,
        isSystemAdmin: false,
        allowPositionFallback: user.departmentMode === 'follow_wecom',
      })) {
        roles.add(role);
      }
    }
    if (isAdmin) {
      roles.add('system_admin');
    }

    return {
      departmentIds,
      departments,
      roles: [...roles],
      isAdmin,
    };
  }

  toCurrentUser(user: WecomUserEntity): CurrentUser {
    const effective = this.getEffectiveAuthorization(user);
    return {
      userId: user.userId,
      corpId: user.corpId,
      name: user.name,
      avatar: user.avatarUrl,
      departmentIds: effective.departmentIds,
      departments: effective.departments,
      position: user.position,
      roles: effective.roles,
      isAdmin: effective.isAdmin,
    };
  }

  toAuthenticatedUser(user: WecomUserEntity): AuthenticatedUserResponse {
    const effective = this.getEffectiveAuthorization(user);
    return {
      userId: user.userId,
      name: user.name,
      avatar: user.avatarUrl,
      departmentIds: effective.departmentIds,
      department: effective.departments,
      position: user.position,
      roles: effective.roles,
      isAdmin: effective.isAdmin,
    };
  }

  normalizeBusinessRoles(roles: string[]): BusinessRole[] {
    const allowed = new Set<string>(BUSINESS_ROLES);
    return [...new Set(roles.filter((role): role is BusinessRole => allowed.has(role)))];
  }

  async findCurrentUser(userId: string): Promise<WecomUserEntity> {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    this.assertCurrentCorp(user);
    return user;
  }

  async lockUser(manager: EntityManager, userId: string): Promise<WecomUserEntity> {
    const user = await manager.findOne(WecomUserEntity, {
      where: { userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    this.assertCurrentCorp(user);
    return user;
  }
}
