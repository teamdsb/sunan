import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { appEnv } from 'src/config/env';
import { REDIS_CLIENT } from 'src/modules/wecom/wecom.constants';
import { WecomCallbackController } from 'src/modules/wecom/wecom-callback.controller';
import { WecomCallbackValidationService } from 'src/modules/wecom/wecom-callback-validation.service';
import { JssdkSignatureService } from 'src/modules/wecom/jssdk-signature.service';
import { WecomAdminService } from 'src/modules/wecom/wecom-admin.service';
import { WecomHttpGateway } from 'src/modules/wecom/wecom-http.gateway';
import { WecomMessageService } from 'src/modules/wecom/wecom-message.service';
import { WecomTokenService } from 'src/modules/wecom/wecom-token.service';
import { WecomRedisClient } from 'src/modules/wecom/wecom-redis.client';
import { WecomNotificationConfigService } from 'src/modules/wecom/wecom-notification-config.service';
import { WecomNotificationConfigEntity } from 'src/database/entities/wecom-notification-config.entity';
import { WecomNotificationConfigAuditEntity } from 'src/database/entities/wecom-notification-config-audit.entity';
import { WecomMessageDeliveryEntity } from 'src/database/entities/wecom-message-delivery.entity';

@Global()
@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([WecomNotificationConfigEntity, WecomNotificationConfigAuditEntity, WecomMessageDeliveryEntity])],
  controllers: [WecomCallbackController],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () =>
        new WecomRedisClient(appEnv.REDIS_URL, {
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
    WecomNotificationConfigService,
  ],
  exports: [
    REDIS_CLIENT,
    WecomHttpGateway,
    WecomTokenService,
    WecomMessageService,
    JssdkSignatureService,
    WecomAdminService,
    WecomCallbackValidationService,
    WecomNotificationConfigService,
  ],
})
export class WecomModule {}
