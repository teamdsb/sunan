import { createHash, randomBytes } from 'crypto';

import { Injectable } from '@nestjs/common';

import { appEnv } from 'src/config/env';
import { WecomTokenService } from 'src/modules/wecom/wecom-token.service';

@Injectable()
export class JssdkSignatureService {
  constructor(private readonly tokenService: WecomTokenService) {}

  async sign(url: string, type: 'corp' | 'agent'): Promise<{
    appId: string;
    timestamp: number;
    nonceStr: string;
    signature: string;
  }> {
    const nonceStr = randomBytes(8).toString('hex');
    const timestamp = Math.floor(Date.now() / 1000);
    const ticket =
      type === 'corp'
        ? await this.tokenService.getCorpJsapiTicket()
        : await this.tokenService.getAgentJsapiTicket(appEnv.WECOM_AGENT_ID);

    return {
      appId: appEnv.WECOM_CORP_ID,
      timestamp,
      nonceStr,
      signature: JssdkSignatureService.buildSignature({
        jsapiTicket: ticket,
        nonceStr,
        timestamp,
        url,
      }),
    };
  }

  static buildSignature(input: {
    jsapiTicket: string;
    nonceStr: string;
    timestamp: number;
    url: string;
  }): string {
    const raw = `jsapi_ticket=${input.jsapiTicket}&noncestr=${input.nonceStr}&timestamp=${input.timestamp}&url=${input.url}`;
    return createHash('sha1').update(raw).digest('hex');
  }
}
