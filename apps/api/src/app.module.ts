import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { DocumentsModule } from './documents/documents.module';
import { StorageModule } from './storage/storage.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [UsersModule, AuthModule, PrismaModule, DocumentsModule, StorageModule, AuditModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
