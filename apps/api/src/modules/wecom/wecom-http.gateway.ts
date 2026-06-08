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
  WecomApprovalTemplateCreateRequest,
  WecomApprovalTemplateCreateResponse,
  WecomDepartmentListResponse,
  WecomMediaResponse,
  WecomOpenApprovalDataResponse,
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

  async createApprovalTemplate(
    accessToken: string,
    payload: WecomApprovalTemplateCreateRequest,
  ): Promise<WecomApprovalTemplateCreateResponse> {
    return this.post<WecomApprovalTemplateCreateResponse>(
      '/cgi-bin/oa/approval/create_template',
      accessToken,
      payload,
    );
  }

  async getOpenApprovalData(
    accessToken: string,
    thirdNo: string,
  ): Promise<WecomOpenApprovalDataResponse> {
    return this.post<WecomOpenApprovalDataResponse>(
      '/cgi-bin/corp/getopenapprovaldata',
      accessToken,
      { thirdNo },
    );
  }

  async getMedia(accessToken: string, mediaId: string): Promise<WecomMediaResponse> {
    try {
      const response = (await firstValueFrom(
        this.httpService.get<ArrayBuffer>('https://qyapi.weixin.qq.com/cgi-bin/media/get', {
          params: {
            access_token: accessToken,
            media_id: mediaId,
          },
          responseType: 'arraybuffer',
        }),
      )) as {
        data: ArrayBuffer;
        headers: Record<string, string | undefined>;
      };

      return {
        buffer: Buffer.from(response.data),
        contentType: response.headers['content-type'] ?? 'application/octet-stream',
      };
    } catch {
      throw new BadGatewayException('Failed to download media from WeCom');
    }
  }

  private async get<T>(
    url: string,
    params: Record<string, string>,
  ): Promise<T> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<T>(`https://qyapi.weixin.qq.com${url}`, { params }),
      );

      this.assertSuccess(data);

      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new BadGatewayException('Failed to reach WeCom API');
    }
  }

  private async post<T>(
    url: string,
    accessToken: string,
    body: unknown,
  ): Promise<T> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<T>(`https://qyapi.weixin.qq.com${url}`, body, {
          params: {
            access_token: accessToken,
          },
        }),
      );

      this.assertSuccess(data);

      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new BadGatewayException('Failed to reach WeCom API');
    }
  }

  private assertSuccess(data: unknown): void {
    if (
      typeof data === 'object' &&
      data !== null &&
      'errcode' in data &&
      typeof data.errcode === 'number' &&
      data.errcode !== 0
    ) {
      const responseBody = data as { errcode: number; errmsg?: string };
      if (responseBody.errcode === 42001) {
        throw new HttpException('WeCom token expired', HttpStatus.UNAUTHORIZED);
      }

      if (responseBody.errcode === 45009) {
        throw new ServiceUnavailableException('WeCom API quota exceeded');
      }

      throw new BadGatewayException(
        typeof responseBody.errmsg === 'string'
          ? responseBody.errmsg
          : 'WeCom API error',
      );
    }
  }
}
