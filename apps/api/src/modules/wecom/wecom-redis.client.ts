import type { OnApplicationShutdown } from '@nestjs/common';
import Redis from 'ioredis';

export class WecomRedisClient extends Redis implements OnApplicationShutdown {
  onApplicationShutdown(): void {
    // Workers finish in onModuleDestroy before their shared connection closes.
    this.disconnect();
  }
}
