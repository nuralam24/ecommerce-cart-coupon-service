import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  lock: {
    duration: parseInt(process.env.REDIS_LOCK_DURATION || '10000', 10),
    retryCount: parseInt(process.env.REDIS_LOCK_RETRY_COUNT || '3', 10),
    retryDelay: parseInt(process.env.REDIS_LOCK_RETRY_DELAY || '200', 10),
  },
}));

