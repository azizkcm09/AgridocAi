import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsProcessor } from './documents.processor';
@Module({
  imports: [
    PrismaModule,
    // Register the BullMQ queue for document processing
    BullModule.registerQueue({
      name: 'document-processing',
    }),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentsProcessor],
  exports: [DocumentsService],
})
export class DocumentsModule {}
