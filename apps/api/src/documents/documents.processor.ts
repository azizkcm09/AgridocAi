/**
 * BullMQ worker for the AI extraction pipeline.
 *
 * The processor is intentionally fire-and-forget: it POSTs the job to the
 * FastAPI worker, marks the document PROCESSING, then exits. The actual
 * extraction can take seconds, so awaiting it here would tie up Nest
 * workers and starve the queue. The Python service calls us back at
 * `POST /documents/:id/extraction-callback` when it is done — that path is
 * where the document transitions to REVIEW_REQUIRED.
 *
 * If the AI service returns a non-2xx on the initial POST we surface the
 * error, mark the document ERROR, and let BullMQ retry per its job config.
 */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const AI_SERVICE_URL  = process.env.AI_SERVICE_URL  ?? 'http://localhost:8000';
const API_BASE_URL    = process.env.API_BASE_URL     ?? 'http://localhost:3000';

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

    // Step 2: Read the document type from the DB. When the type is UNKNOWN
    // we pass it through verbatim so the AI service runs its classifier
    // first; otherwise the AI service trusts the caller's choice and skips
    // classification. The classifier's result is persisted by
    // handleExtractionCallback in documents.service.ts.
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    const documentType = document?.type ?? 'UNKNOWN';

    // Step 3: Build the callback URL that Python will call when done
    const callbackUrl = `${API_BASE_URL}/documents/${documentId}/extraction-callback`;

    // Step 4: Tell the AI service to start processing (fire-and-forget)
    //   We send the callbackUrl so Python knows where to POST results.
    //   We DON'T await the extraction itself — Python will call us back.
    try {
      const response = await fetch(`${AI_SERVICE_URL}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath, documentType, callbackUrl }),
        signal: AbortSignal.timeout(10_000), // 10s timeout — just to send the request, not wait for extraction
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`AI service error ${response.status}: ${errorBody}`);
      }

      this.logger.log(`AI service accepted job for ${documentId}. Waiting for callback.`);
    } catch (fetchError) {
      this.logger.error(`AI service call failed for ${documentId}: ${fetchError.message}`);
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'ERROR' },
      });
      throw fetchError;
    }
  }
}
