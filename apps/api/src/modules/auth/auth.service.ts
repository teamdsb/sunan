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
import { AuthorizationService } from 'src/modules/auth/authorization.service';
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
    private readonly authorizationService: AuthorizationService,
  ) {}

  async exchangeCode(code: string): Promise<{
    accessToken: string;
    expiresIn: number;
    privateInfoAuthorized: boolean;
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
    const existingUser = await this.wecomUserRepository.findOne({
      where: { userId: detail.userid },
    });
    const sensitiveDetail = userInfo.user_ticket
      ? await this.getSensitiveUserDetail(accessToken, userInfo.user_ticket)
      : null;

    const revision = await this.authorizationService.nextSourceRevision();
    const saved = await this.authorizationService.applySourceProfile({
      userId: detail.userid,
      corpId: appEnv.WECOM_CORP_ID,
      name: detail.name,
      avatarUrl:
        sensitiveDetail?.avatar?.trim() ||
        existingUser?.avatarUrl ||
        detail.avatar ||
        null,
      departmentIds,
      departmentNames: departments,
      departmentCodes: this.roleResolver.resolveDepartmentCodes({
        departmentIds,
        departmentNames: departments,
      }),
      position: detail.position ?? null,
      rawProfile: detail as unknown as Record<string, unknown>,
      sourceStatus:
        detail.status === undefined && detail.enable === undefined
          ? 'active'
          : (detail.status ?? detail.enable) === 1
            ? 'active'
            : 'inactive',
      sourceStatusUpdatedAt: new Date(),
      lastLoginAt: new Date(),
      loginStatus: 'logged_in',
      sourceRevision: revision,
    });

    // Re-read after the source transaction so a concurrent admin edit is
    // reflected in the OAuth response rather than returning a stale snapshot.
    const savedUser = await this.wecomUserRepository.findOneOrFail({
      where: { userId: saved.user.userId, corpId: appEnv.WECOM_CORP_ID },
    });

    return {
      accessToken: await this.jwtService.signAsync({
        sub: savedUser.userId,
        corpId: savedUser.corpId,
        name: savedUser.name,
      } satisfies JwtPayload),
      expiresIn: 7200,
      privateInfoAuthorized: sensitiveDetail !== null,
      user: this.authorizationService.toAuthenticatedUser(savedUser),
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

    if (payload.corpId !== appEnv.WECOM_CORP_ID) {
      throw new UnauthorizedException('用户不属于当前企业');
    }
    const currentUser = this.authorizationService.toAuthenticatedUser(user);

    return {
      accessToken: await this.jwtService.signAsync({
        sub: user.userId,
        corpId: user.corpId,
        name: user.name,
      } satisfies JwtPayload),
      expiresIn: 7200,
      user: currentUser,
    };
  }

  async getCurrentUser(userId: string, expectedCorpId = appEnv.WECOM_CORP_ID): Promise<CurrentUser> {
    if (expectedCorpId !== appEnv.WECOM_CORP_ID) {
      throw new UnauthorizedException('用户不属于当前企业');
    }
    const user = await this.wecomUserRepository.findOne({ where: { userId } });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return this.authorizationService.toCurrentUser(user);
  }

  toAuthenticatedUser(user: WecomUserEntity): AuthenticatedUserResponse {
    return this.authorizationService.toAuthenticatedUser(user);
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

  private async getSensitiveUserDetail(
    accessToken: string,
    userTicket: string,
  ) {
    try {
      return await this.wecomHttpGateway.getUserSensitiveDetail(
        accessToken,
        userTicket,
      );
    } catch {
      // Sensitive-field authorization is optional for authentication. Do not
      // discard an already persisted avatar merely because this short-lived
      // ticket has expired or the member has not confirmed the authorization.
      return null;
    }
  }

}
