import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';

import { WecomCallbackValidationService } from 'src/modules/wecom/wecom-callback-validation.service';

@Controller('/api/v1/wecom/callback')
export class WecomCallbackController {
  constructor(private readonly validationService: WecomCallbackValidationService) {}

  @Get()
  verifyUrl(
    @Query('signature') signature: string | undefined,
    @Query('msg_signature') msgSignature: string | undefined,
    @Query('timestamp') timestamp: string | undefined,
    @Query('nonce') nonce: string | undefined,
    @Query('echostr') echoStr: string | undefined,
    @Res() response: Response,
  ): void {
    const verifiedEcho = this.validationService.verifyUrl({
      signature,
      msgSignature,
      timestamp,
      nonce,
      echoStr,
    });
    response.type('text/plain; charset=utf-8').send(verifiedEcho);
  }
}
