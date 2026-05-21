import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';

import { appEnv } from 'src/config/env';
import { REDIS_CLIENT } from 'src/modules/wecom/wecom.constants';
import { WecomCallbackController } from 'src/modules/wecom/wecom-callback.controller';
import { WecomCallbackValidationService } from 'src/modules/wecom/wecom-callback-validation.service';
import { JssdkSignatureService } from 'src/modules/wecom/jssdk-signature.service';
import { WecomAdminService } from 'src/modules/wecom/wecom-admin.service';
import { WecomHttpGateway } from 'src/modules/wecom/wecom-http.gateway';
import { WecomMessageService } from 'src/modules/wecom/wecom-message.service';
import { WecomTokenService } from 'src/modules/wecom/wecom-token.service';

@Global()
@Module({
  imports: [HttpModule],
  controllers: [WecomCallbackController],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () =>
        new Redis(appEnv.REDIS_URL, {
          username: appEnv.REDIS_USERNAME,
          password: appEnv.REDIS_PASSWORD,
          lazyConnect: true,
          maxRetriesPerRequest: 1,
        }),
    },
    WecomHttpGateway,
    WecomTokenService,
    WecomMessageService,
    JssdkSignatureService,
    WecomAdminService,
    WecomCallbackValidationService,
  ],
  exports: [
    REDIS_CLIENT,
    WecomHttpGateway,
    WecomTokenService,
    WecomMessageService,
    JssdkSignatureService,
    WecomAdminService,
    WecomCallbackValidationService,
  ],
})
export class WecomModule {}
