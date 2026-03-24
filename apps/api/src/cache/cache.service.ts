import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis;

  // --- Lifecycle: connect on startup, disconnect on shutdown ---

  onModuleInit() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      keyPrefix: 'cache:',   // All our keys start with "cache:" to avoid collisions with BullMQ
    });
    this.logger.log('Redis cache connected');
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }

  // --- GET: Retrieve a cached value ---
  // Returns null if the key doesn't exist or has expired
  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  // --- SET: Store a value with a TTL (time-to-live in seconds) ---
  // After `ttl` seconds, Redis automatically deletes the key
  async set(key: string, value: unknown, ttl: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
  }

  // --- DEL: Remove one or more keys immediately ---
  // Used for cache invalidation (e.g., after a document is uploaded)
  async del(...keys: string[]): Promise<void> {
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // --- DEL by pattern: Remove all keys matching a pattern ---
  // Example: invalidate("stats:*") clears all user stats caches at once
  // Uses SCAN (non-blocking) instead of KEYS (blocks Redis)
  async invalidate(pattern: string): Promise<void> {
    const fullPattern = `cache:${pattern}`;  // account for keyPrefix
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor, 'MATCH', fullPattern, 'COUNT', 100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        // Keys from SCAN include the prefix, but redis.del with keyPrefix would double-prefix
        // So we use the raw connection to delete
        const pipeline = this.redis.pipeline();
        for (const key of keys) {
          // Remove the "cache:" prefix since ioredis will add it back
          pipeline.del(key.replace(/^cache:/, ''));
        }
        await pipeline.exec();
      }
    } while (cursor !== '0');
  }
}
