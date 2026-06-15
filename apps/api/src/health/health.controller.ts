import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';

import { OssService } from 'src/modules/files/oss.service';
import { REDIS_CLIENT } from 'src/modules/wecom/wecom.constants';

interface DependencyStatus {
  database: 'ok' | 'error';
  redis: 'ok' | 'error';
  objectStorage: 'ok' | 'error';
}

const HEALTH_CHECK_TIMEOUT_MS = 3_000;

@Controller('/api/health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly ossService: OssService,
  ) {}

  @Get()
  getHealth(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  async getReadiness(): Promise<{
    status: 'ready';
    dependencies: DependencyStatus;
  }> {
    const [database, redis, objectStorage] = await Promise.all([
      this.check(() => this.dataSource.query('SELECT 1')),
      this.check(() => this.redis.ping()),
      this.check(() => this.ossService.checkConnection()),
    ]);
    const dependencies: DependencyStatus = {
      database,
      redis,
      objectStorage,
    };

    if (Object.values(dependencies).some((status) => status === 'error')) {
      throw new ServiceUnavailableException({
        status: 'unavailable',
        dependencies,
      });
    }

    return {
      status: 'ready',
      dependencies,
    };
  }

  private async check(operation: () => Promise<unknown>): Promise<'ok' | 'error'> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        operation(),
        new Promise((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error('health check timeout')),
            HEALTH_CHECK_TIMEOUT_MS,
          );
        }),
      ]);
      return 'ok';
    } catch {
      return 'error';
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }
}
