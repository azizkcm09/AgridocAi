import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';

@Processor('document-processing')
export class DocumentsProcessor extends WorkerHost {
  private readonly logger = new Logger(DocumentsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { documentId, storagePath, userId } = job.data;
    this.logger.log(`Picked up job ${job.id} for document: ${documentId}`);

    // Step 1: Mark document as PROCESSING
    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: 'PROCESSING' },
    });

    await this.audit.logAction({
      documentId,
      userId,
      action: 'AUTO_EXTRACT',
      description: 'Background worker started processing document',
    });

    // Step 2: Read document type from DB (set during upload, defaults to UNKNOWN)
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    const documentType = document?.type ?? 'UNKNOWN';

    // Step 3: Call the FastAPI AI service
    let aiResult: { payload: Record<string, any>; confidence: number; raw_text: string };

    try {
      const response = await fetch(`${AI_SERVICE_URL}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath, documentType }),
        signal: AbortSignal.timeout(120_000),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`AI service error ${response.status}: ${errorBody}`);
      }

      aiResult = await response.json();
    } catch (fetchError) {
      this.logger.error(`AI service call failed for ${documentId}: ${fetchError.message}`);
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'ERROR' },
      });
      throw fetchError;
    }

    // Step 4: Save extracted data and update status (both in one transaction)
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.extractedData.upsert({
          where: { documentId },
          update: { payload: aiResult.payload, confidence: aiResult.confidence },
          create: { documentId, payload: aiResult.payload, confidence: aiResult.confidence },
        });

        await tx.document.update({
          where: { id: documentId },
          data: { status: 'REVIEW_REQUIRED' },
        });
      });

      await this.audit.logAction({
        documentId,
        userId,
        action: 'AUTO_EXTRACT',
        description: `Extraction complete. Confidence: ${aiResult.confidence}%`,
        newValue: aiResult.payload,
      });

      this.logger.log(`✅ Document ${documentId} processed. Confidence: ${aiResult.confidence}%`);
    } catch (dbError) {
      this.logger.error(`DB write failed for ${documentId}: ${dbError.message}`);
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'ERROR' },
      });
      throw dbError;
    }
  }
}
