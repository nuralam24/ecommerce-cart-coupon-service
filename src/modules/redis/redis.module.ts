import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import { RedisLockService } from './redis-lock.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const Redis = (await import('ioredis')).default;
        return new Redis({
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
          maxRetriesPerRequest: null,
        });
      },
      inject: [ConfigService],
    },
    RedisService,
    RedisLockService,
  ],
  exports: ['REDIS_CLIENT', RedisService, RedisLockService],
})
export class RedisModule {}

