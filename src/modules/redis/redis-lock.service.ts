import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import Redlock, { Lock, ResourceLockedError } from 'redlock';

@Injectable()
export class RedisLockService {
  private readonly logger = new Logger(RedisLockService.name);
  private redlock: Redlock;
  private readonly lockDuration: number;
  private readonly retryCount: number;
  private readonly retryDelay: number;

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    this.lockDuration = this.configService.get<number>('redis.lock.duration', 10000);
    this.retryCount = this.configService.get<number>('redis.lock.retryCount', 3);
    this.retryDelay = this.configService.get<number>('redis.lock.retryDelay', 200);

    this.redlock = new Redlock([this.redis], {
      driftFactor: 0.01,
      retryCount: this.retryCount,
      retryDelay: this.retryDelay,
      retryJitter: 200,
      automaticExtensionThreshold: 500,
    });

    this.redlock.on('error', (error) => {
      if (!(error instanceof ResourceLockedError)) {
        this.logger.error('Redlock error:', error);
      }
    });
  }

  async acquireCouponLock(couponId: string): Promise<Lock | null> {
    const resource = `lock:coupon:${couponId}`;
    try {
      const lock = await this.redlock.acquire([resource], this.lockDuration);
      this.logger.debug(`Lock acquired for coupon: ${couponId}`);
      return lock;
    } catch (error) {
      if (error instanceof ResourceLockedError) {
        this.logger.warn(`Could not acquire lock for coupon: ${couponId} - resource is locked`);
        return null;
      }
      this.logger.error(`Error acquiring lock for coupon: ${couponId}`, error);
      throw error;
    }
  }

  async acquireUserCouponLock(couponId: string, customerId: string): Promise<Lock | null> {
    const resource = `lock:coupon:${couponId}:user:${customerId}`;
    try {
      const lock = await this.redlock.acquire([resource], this.lockDuration);
      this.logger.debug(`Lock acquired for coupon ${couponId}, user: ${customerId}`);
      return lock;
    } catch (error) {
      if (error instanceof ResourceLockedError) {
        this.logger.warn(
          `Could not acquire lock for coupon ${couponId}, user: ${customerId} - resource is locked`,
        );
        return null;
      }
      this.logger.error(`Error acquiring lock for coupon ${couponId}, user: ${customerId}`, error);
      throw error;
    }
  }

  async releaseLock(lock: Lock): Promise<void> {
    try {
      await lock.release();
      this.logger.debug('Lock released successfully');
    } catch (error) {
      this.logger.error('Error releasing lock:', error);
    }
  }

  async withCouponLock<T>(
    couponId: string,
    fn: () => Promise<T>,
  ): Promise<{ success: true; result: T } | { success: false; reason: 'LOCK_NOT_ACQUIRED' }> {
    const lock = await this.acquireCouponLock(couponId);
    if (!lock) {
      return { success: false, reason: 'LOCK_NOT_ACQUIRED' };
    }

    try {
      const result = await fn();
      return { success: true, result };
    } finally {
      await this.releaseLock(lock);
    }
  }

  async withCouponUserLock<T>(
    couponId: string,
    customerId: string,
    fn: () => Promise<T>,
  ): Promise<{ success: true; result: T } | { success: false; reason: 'LOCK_NOT_ACQUIRED' }> {
    const resource1 = `lock:coupon:${couponId}`;
    const resource2 = `lock:coupon:${couponId}:user:${customerId}`;

    try {
      const lock = await this.redlock.acquire([resource1, resource2], this.lockDuration);
      try {
        const result = await fn();
        return { success: true, result };
      } finally {
        await lock.release();
      }
    } catch (error) {
      if (error instanceof ResourceLockedError) {
        this.logger.warn(
          `Could not acquire locks for coupon ${couponId}, user: ${customerId} - resource is locked`,
        );
        return { success: false, reason: 'LOCK_NOT_ACQUIRED' };
      }
      throw error;
    }
  }
}

