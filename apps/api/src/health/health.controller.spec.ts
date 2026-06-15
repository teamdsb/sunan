import { ServiceUnavailableException } from '@nestjs/common';
import type Redis from 'ioredis';
import type { DataSource } from 'typeorm';

import { HealthController } from 'src/health/health.controller';
import type { OssService } from 'src/modules/files/oss.service';

function createController(options?: {
  database?: boolean;
  redis?: boolean;
  objectStorage?: boolean;
}) {
  const dataSource = {
    query: jest.fn(() =>
      options?.database === false
        ? Promise.reject(new Error('database unavailable'))
        : Promise.resolve([{ '?column?': 1 }]),
    ),
  } as unknown as DataSource;
  const redis = {
    ping: jest.fn(() =>
      options?.redis === false
        ? Promise.reject(new Error('redis unavailable'))
        : Promise.resolve('PONG'),
    ),
  } as unknown as Redis;
  const ossService = {
    checkConnection: jest.fn(() =>
      options?.objectStorage === false
        ? Promise.reject(new Error('object storage unavailable'))
        : Promise.resolve(),
    ),
  } as unknown as OssService;

  return new HealthController(dataSource, redis, ossService);
}

describe('HealthController', () => {
  it('reports liveness without probing dependencies', () => {
    expect(createController().getHealth()).toEqual({ status: 'ok' });
  });

  it('reports readiness when all dependencies respond', async () => {
    await expect(createController().getReadiness()).resolves.toEqual({
      status: 'ready',
      dependencies: {
        database: 'ok',
        redis: 'ok',
        objectStorage: 'ok',
      },
    });
  });

  it('returns unavailable when a dependency cannot respond', async () => {
    await expect(
      createController({ redis: false }).getReadiness(),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
