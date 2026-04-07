import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { DocumentsModule } from './documents/documents.module';
import { StorageModule } from './storage/storage.module';
import { AuditModule } from './audit/audit.module';
import { AdminModule } from './admin/admin.module';
import { BullModule } from '@nestjs/bullmq';
import { CacheModule } from './cache/cache.module';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    UsersModule,
    AuthModule,
    DocumentsModule,
    StorageModule,
    AuditModule,
    AdminModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 5 },   // 5 requests per second
      { name: 'medium', ttl: 60000, limit: 60 }, // 60 requests per minute
    ]),
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
