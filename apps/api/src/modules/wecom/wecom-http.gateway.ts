import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import type {
  WecomDepartmentListResponse,
  WecomTicketResponse,
  WecomTokenResponse,
  WecomUserDetailResponse,
  WecomUserInfoResponse,
} from 'src/modules/wecom/wecom.types';

@Injectable()
export class WecomHttpGateway {
  constructor(private readonly httpService: HttpService) {}

  async getAccessToken(
    corpId: string,
    corpSecret: string,
  ): Promise<WecomTokenResponse> {
    return this.get<WecomTokenResponse>('/cgi-bin/gettoken', {
      corpid: corpId,
      corpsecret: corpSecret,
    });
  }

  async getCorpJsapiTicket(accessToken: string): Promise<WecomTicketResponse> {
    return this.get<WecomTicketResponse>('/cgi-bin/get_jsapi_ticket', {
      access_token: accessToken,
    });
  }

  async getAgentJsapiTicket(accessToken: string): Promise<WecomTicketResponse> {
    return this.get<WecomTicketResponse>('/cgi-bin/ticket/get', {
      access_token: accessToken,
      type: 'agent_config',
    });
  }

  async getUserInfo(
    accessToken: string,
    code: string,
  ): Promise<WecomUserInfoResponse> {
    return this.get<WecomUserInfoResponse>('/cgi-bin/auth/getuserinfo', {
      access_token: accessToken,
      code,
    });
  }

  async getUserDetail(
    accessToken: string,
    userId: string,
  ): Promise<WecomUserDetailResponse> {
    return this.get<WecomUserDetailResponse>('/cgi-bin/user/get', {
      access_token: accessToken,
      userid: userId,
    });
  }

  async listDepartments(accessToken: string): Promise<WecomDepartmentListResponse> {
    return this.get<WecomDepartmentListResponse>('/cgi-bin/department/list', {
      access_token: accessToken,
    });
  }

  private async get<T>(
    url: string,
    params: Record<string, string>,
  ): Promise<T> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<T>(`https://qyapi.weixin.qq.com${url}`, { params }),
      );

      if (
        typeof data === 'object' &&
        data !== null &&
        'errcode' in data &&
        typeof data.errcode === 'number' &&
        data.errcode !== 0
      ) {
        const responseBody = data as { errcode: number; errmsg?: string };
        if (data.errcode === 42001) {
          throw new HttpException('WeCom token expired', HttpStatus.UNAUTHORIZED);
        }

        if (data.errcode === 45009) {
          throw new ServiceUnavailableException('WeCom API quota exceeded');
        }

        throw new BadGatewayException(
          typeof responseBody.errmsg === 'string'
            ? responseBody.errmsg
            : 'WeCom API error',
        );
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new BadGatewayException('Failed to reach WeCom API');
    }
  }
}
