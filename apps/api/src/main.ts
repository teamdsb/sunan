import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { configureApp } from 'src/app.bootstrap';
import { appEnv } from 'src/config/env';
import { AppModule } from 'src/app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.listen(appEnv.PORT);
}

void bootstrap();
