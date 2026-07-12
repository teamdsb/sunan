import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { WecomTokenService } from './wecom-token.service';

interface SendTextCardOptions {
  userIds: string[];
  title: string;
  description: string;
  url: string;
  btnText?: string;
}

export interface SendTextCardResult {
  success: boolean;
  invalidUser: string[];
  errcode?: number;
  failureReason?: string;
}

@Injectable()
export class WecomMessageService {
  private readonly logger = new Logger(WecomMessageService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly tokenService: WecomTokenService,
  ) {}

  async sendTextCard(options: SendTextCardOptions): Promise<SendTextCardResult> {
    const invalidUser = new Set<string>();
    let accessToken = await this.tokenService.getAccessToken();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const { data } = await firstValueFrom(
          this.httpService.post<{
            errcode: number;
            errmsg: string;
            invaliduser?: string;
          }>(`https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`, {
            touser: options.userIds.join('|'),
            msgtype: 'textcard',
            agentid: Number(process.env.WECOM_AGENT_ID ?? 0),
            textcard: {
              title: options.title,
              description: options.description,
              url: options.url,
              btntxt: options.btnText ?? '查看详情',
            },
            safe: 0,
          }, {
            timeout: 10_000,
          }),
        );

        if (data.errcode === 0) {
          if (data.invaliduser) {
            data.invaliduser.split('|').filter(Boolean).forEach((id) => invalidUser.add(id));
          }
          return { success: true, invalidUser: [...invalidUser], errcode: data.errcode };
        }

        if (data.errcode === 42001) {
          await this.tokenService.forceRefresh('access_token');
          accessToken = await this.tokenService.getAccessToken();
          continue;
        }

        if (data.invaliduser) {
          data.invaliduser.split('|').filter(Boolean).forEach((id) => invalidUser.add(id));
        }

        const failureReason = `WeCom API error ${data.errcode}: ${data.errmsg}`;
        this.logger.warn(`WeCom sendTextCard failed: ${failureReason}`);
        return { success: false, invalidUser: [...invalidUser], errcode: data.errcode, failureReason };
      } catch (error) {
        const axiosLike = error as { code?: string };
        if (axiosLike.code === 'ECONNABORTED' && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 30_000));
          continue;
        }
        throw error;
      }
    }

    return {
      success: false,
      invalidUser: [...invalidUser],
      failureReason: 'WeCom API request failed after retries',
    };
  }
}
