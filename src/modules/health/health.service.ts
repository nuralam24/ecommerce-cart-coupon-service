import { Injectable, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Redis } from 'ioredis';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: {
      status: 'up' | 'down';
      latencyMs?: number;
      error?: string;
    };
    redis: {
      status: 'up' | 'down';
      latencyMs?: number;
      error?: string;
    };
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    const dbHealth = await this.checkDatabase();
    const redisHealth = await this.checkRedis();

    const isHealthy = dbHealth.status === 'up' && redisHealth.status === 'up';

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp,
      services: {
        database: dbHealth,
        redis: redisHealth,
      },
    };
  }

  private async checkDatabase(): Promise<{
    status: 'up' | 'down';
    latencyMs?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'up',
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkRedis(): Promise<{
    status: 'up' | 'down';
    latencyMs?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      await this.redis.ping();
      return {
        status: 'up',
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

