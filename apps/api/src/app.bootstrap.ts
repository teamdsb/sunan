import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { text } from 'express';

import { HttpExceptionFilter } from 'src/common/filters/http-exception.filter';
import { ResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { appEnv } from 'src/config/env';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function configureApp(app: INestApplication): void {
  app.use(text({ type: ['text/xml', 'application/xml'] }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  const allowedOrigins = new Set([
    appEnv.WEB_PUBLIC_URL,
    'http://localhost:5173',
    'http://localhost:4173',
  ]);
  const appDomainPattern = new RegExp(
    `^https://([a-z0-9-]+\\.)?${escapeRegex(appEnv.APP_DOMAIN)}$`,
    'i',
  );

  app.enableCors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin) || appDomainPattern.test(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
  });

  if (appEnv.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Sunan API')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('/api/docs', app, document);
  }
}
