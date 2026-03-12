import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health() {
    const services: Record<string, string> = {};

    // Check database
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      services.database = 'connected';
    } catch {
      services.database = 'disconnected';
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
