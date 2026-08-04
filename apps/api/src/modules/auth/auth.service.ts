import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';

import type { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { appEnv } from 'src/config/env';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import type {
  AuthenticatedUserResponse,
  JwtPayload,
} from 'src/modules/auth/auth.types';
import { RoleResolverService } from 'src/modules/auth/role-resolver.service';
import { WecomAdminService } from 'src/modules/wecom/wecom-admin.service';
import { WecomHttpGateway } from 'src/modules/wecom/wecom-http.gateway';
import { WecomTokenService } from 'src/modules/wecom/wecom-token.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(WecomUserEntity)
    private readonly wecomUserRepository: Repository<WecomUserEntity>,
    private readonly jwtService: JwtService,
    private readonly tokenService: WecomTokenService,
    private readonly wecomHttpGateway: WecomHttpGateway,
    private readonly roleResolver: RoleResolverService,
    private readonly adminService: WecomAdminService,
  ) {}

  async exchangeCode(code: string): Promise<{
    accessToken: string;
    expiresIn: number;
    user: AuthenticatedUserResponse;
  }> {
    const accessToken = await this.tokenService.getAccessToken();
    const userInfo = await this.wecomHttpGateway.getUserInfo(accessToken, code);
    const userId = userInfo.UserId ?? userInfo.userid;

    if (!userId) {
      throw new UnauthorizedException('code 已失效或不可用');
    }

    const detail = await this.wecomHttpGateway.getUserDetail(accessToken, userId);
    if (!detail.userid) {
      throw new ForbiddenException('用户不在企业通讯录中');
    }

    const departmentIds = this.roleResolver.normalizeDepartmentIds(
      detail.department ?? [],
    );
    const departments = await this.resolveDepartmentNames(
      accessToken,
      departmentIds,
    );
    const isSystemAdmin = this.adminService.isSystemAdmin(detail.userid);
    const roles = this.roleResolver.resolveRoles({
      departmentIds,
      departmentNames: departments,
      position: detail.position ?? null,
      isSystemAdmin,
    });

    const existingUser = await this.wecomUserRepository.findOne({
      where: { userId: detail.userid },
    });

    const entity = this.wecomUserRepository.create({
      ...(existingUser ?? {}),
      userId: detail.userid,
      corpId: appEnv.WECOM_CORP_ID,
      name: detail.name,
      avatarUrl: detail.avatar ?? null,
      departmentIds,
      departmentNames: departments,
      departmentCodes: this.roleResolver.resolveDepartmentCodes({
        departmentIds,
        departmentNames: departments,
      }),
      position: detail.position ?? null,
      isSystemAdmin,
      rawProfile: detail as unknown as Record<string, unknown>,
    });

    await this.wecomUserRepository.save(entity);

    const savedUser = await this.wecomUserRepository.findOneOrFail({
      where: { userId: detail.userid },
    });

    return {
      accessToken: await this.jwtService.signAsync({
        sub: savedUser.userId,
        corpId: savedUser.corpId,
        name: savedUser.name,
      } satisfies JwtPayload),
      expiresIn: 7200,
      user: this.toAuthenticatedUser(savedUser, roles),
    };
  }

  async refreshToken(token: string): Promise<{
    accessToken: string;
    expiresIn: number;
    user: AuthenticatedUserResponse;
  }> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: appEnv.JWT_SECRET,
        ignoreExpiration: true,
      });
    } catch {
      throw new UnauthorizedException('无效的 JWT');
    }

    const user = await this.wecomUserRepository.findOne({
      where: { userId: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const roles = this.resolveRolesForUser(user);

    return {
      accessToken: await this.jwtService.signAsync({
        sub: user.userId,
        corpId: user.corpId,
        name: user.name,
      } satisfies JwtPayload),
      expiresIn: 7200,
      user: this.toAuthenticatedUser(user, roles),
    };
  }

  async getCurrentUser(userId: string): Promise<CurrentUser> {
    const user = await this.wecomUserRepository.findOne({ where: { userId } });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const roles = this.resolveRolesForUser(user);

    return {
      userId: user.userId,
      corpId: user.corpId,
      name: user.name,
      avatar: user.avatarUrl,
      departmentIds: this.normalizedDepartmentIdsForUser(user),
      departments: user.departmentNames,
      position: user.position,
      roles,
      isAdmin: roles.includes('system_admin'),
    };
  }

  toAuthenticatedUser(
    user: WecomUserEntity,
    roles: string[],
  ): AuthenticatedUserResponse {
    return {
      userId: user.userId,
      name: user.name,
      avatar: user.avatarUrl,
      departmentIds: this.normalizedDepartmentIdsForUser(user),
      department: user.departmentNames,
      position: user.position,
      roles,
      isAdmin: roles.includes('system_admin'),
    };
  }

  private async resolveDepartmentNames(
    accessToken: string,
    departmentIds: number[],
  ): Promise<string[]> {
    if (departmentIds.length === 0) {
      return [];
    }

    const departments = await this.wecomHttpGateway.listDepartments(accessToken);
    const nameById = new Map(
      departments.department.map((department) => [department.id, department.name]),
    );

    return departmentIds.map(
      (departmentId) =>
        nameById.get(departmentId) ??
        this.roleResolver.resolveFallbackDepartmentName(departmentId),
    );
  }

  private resolveRolesForUser(user: WecomUserEntity): string[] {
    return this.roleResolver.resolveRoles({
      departmentIds: this.normalizedDepartmentIdsForUser(user),
      departmentNames: user.departmentNames,
      position: user.position,
      isSystemAdmin: this.adminService.isSystemAdmin(user.userId),
    });
  }

  private normalizedDepartmentIdsForUser(user: WecomUserEntity): number[] {
    return this.roleResolver.normalizeDepartmentIds(user.departmentIds ?? []);
  }
}
