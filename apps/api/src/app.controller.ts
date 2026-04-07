import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from './prisma/prisma.service';
import { CacheService } from './cache/cache.service';

@Controller()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  @Get('health')
  @SkipThrottle()
  async health() {
    const services: Record<string, string> = {};

    // Check database
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      services.database = 'connected';
    } catch {
      services.database = 'disconnected';
    }

    // Check Redis
    try {
      await this.cache.set('health-check', 'ok', 5);
      services.redis = 'connected';
    } catch {
      services.redis = 'disconnected';
    }

    // Check AI service
    try {
      const aiUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';
      const res = await fetch(aiUrl, { signal: AbortSignal.timeout(3000) });
      services.ai = res.ok ? 'connected' : 'disconnected';
    } catch {
      services.ai = 'disconnected';
    }

    return services;
  }
}
