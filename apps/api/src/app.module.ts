import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import appConfig from 'src/config/app.config';
import { HealthController } from 'src/health/health.controller';
import { AuthModule } from 'src/modules/auth/auth.module';
import { CertificateModule } from 'src/modules/certificate/certificate.module';
import { EnterprisePolicyModule } from 'src/modules/enterprise-policy/enterprise-policy.module';
import { EnterpriseProfileModule } from 'src/modules/enterprise-profile/enterprise-profile.module';
import { FilesModule } from 'src/modules/files/files.module';
import { SettingsModule } from 'src/modules/settings/settings.module';
import { ReminderModule } from 'src/modules/reminder/reminder.module';
import { ShipMonitorModule } from 'src/modules/ship-monitor/ship-monitor.module';
import { OfficeModule } from 'src/modules/office/office.module';
import { WecomModule } from 'src/modules/wecom/wecom.module';
import { RequestIdMiddleware } from 'src/common/middleware/request-id.middleware';
import { buildTypeOrmOptions } from 'src/database/typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    TypeOrmModule.forRoot(buildTypeOrmOptions()),
    WecomModule,
    AuthModule,
    FilesModule,
    EnterpriseProfileModule,
    EnterprisePolicyModule,
    ShipMonitorModule,
    SettingsModule,
    ReminderModule,
    CertificateModule,
    OfficeModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
