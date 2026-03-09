import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Processor('document-processing') //  Listens to this specific queue
export class DocumentsProcessor extends WorkerHost {
  private readonly logger = new Logger(DocumentsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {
    super();
  }

  // This method fires automatically whenever a new job hits the queue
  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(` Picked up job ${job.id} for document: ${job.data.documentId}`);

    try {
      // 1. Update status to PROCESSING so the frontend knows it started
      await this.prisma.document.update({
        where: { id: job.data.documentId },
        data: { status: 'PROCESSING' },
      });

      await this.audit.logAction({
        documentId: job.data.documentId,
        userId: job.data.userId,
        action: 'AUTO_EXTRACT',
        description: 'Background worker started processing document',
      });

      // 2. Simulate AI processing time (e.g., 3 seconds)
      await new Promise((resolve) => setTimeout(resolve, 3000));

      this.logger.log(`✅ Successfully processed document: ${job.data.documentId}`);

    } catch (error) {
      this.logger.error(`❌ Failed to process document ${job.data.documentId}: ${error.message}`);
      
      // Update status to ERROR if it fails
      await this.prisma.document.update({
        where: { id: job.data.documentId },
        data: { status: 'ERROR' },
      });
      throw error;
    }
  }
}