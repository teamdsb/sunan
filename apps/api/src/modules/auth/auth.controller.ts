import {
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { CurrentUserDecorator } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import type { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { AuthService } from 'src/modules/auth/auth.service';
import { JssdkSignatureDto } from 'src/modules/auth/dto/jssdk-signature.dto';
import { WecomCallbackDto } from 'src/modules/auth/dto/wecom-callback.dto';
import { JssdkSignatureService } from 'src/modules/wecom/jssdk-signature.service';

@Controller('/api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jssdkSignatureService: JssdkSignatureService,
  ) {}

  @Get('wecom/callback')
  async wecomCallback(@Query() query: WecomCallbackDto): Promise<{
    data: {
      accessToken: string;
      expiresIn: number;
      user: ReturnType<AuthService['toAuthenticatedUser']>;
    };
  }> {
    const result = await this.authService.exchangeCode(query.code);
    return { data: result };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Headers('authorization') authorization?: string): Promise<{
    data: {
      accessToken: string;
      expiresIn: number;
      user: ReturnType<AuthService['toAuthenticatedUser']>;
    };
  }> {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      throw new UnauthorizedException('缺少 Bearer Token');
    }

    const result = await this.authService.refreshToken(token);
    return { data: result };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(
    @CurrentUserDecorator() currentUser: CurrentUser,
  ): Promise<{ data: ReturnType<AuthService['toAuthenticatedUser']> }> {
    const result = await this.authService.getCurrentUser(currentUser.userId);
    return {
      data: {
        userId: result.userId,
        name: result.name,
        avatar: result.avatar,
        department: result.departments,
        position: result.position,
        roles: result.roles,
        isAdmin: result.isAdmin,
      },
    };
  }

  @Get('jssdk/signature')
  @UseGuards(JwtAuthGuard)
  async getSignature(@Query() query: JssdkSignatureDto): Promise<{
    data: Awaited<ReturnType<JssdkSignatureService['sign']>>;
  }> {
    return {
      data: await this.jssdkSignatureService.sign(query.url, query.type),
    };
  }
}
