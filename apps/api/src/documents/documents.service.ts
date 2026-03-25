import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { BadRequestException } from '@nestjs/common';
import { getPayloadSchema } from './dto/extraction.schema';
import type { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq/dist/decorators/inject-queue.decorator';
import { CacheService } from '../cache/cache.service';


@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private cache: CacheService,
    @InjectQueue('document-processing') private documentQueue: Queue,
  ) {}

  // Invalidate cached stats for a specific user
  // Called after any action that changes document counts or confidence
  private async clearStatsCache(userId: string) {
    await this.cache.del(`stats:${userId}`, `analytics:${userId}`);
  }

  // --- CREATE: Save metadata after MinIO upload ---
  async createDocument(userId: string, dto: CreateDocumentDto) {
    const document = await this.prisma.document.create({
      data: {
        userId,
        originalName: dto.originalName,
        storagePath: dto.storagePath,
        mimeType: dto.mimeType,
        size: dto.size,
        status: 'PENDING',
        type: dto.type ?? 'UNKNOWN',
      },
    });

    await this.audit.logAction({
      userId,
      documentId: document.id,
      action: 'UPLOAD',
      description: `User synced uploaded file: ${dto.originalName}`,
    });
    await this.documentQueue.add('extract-data', {
      documentId: document.id,
      storagePath: document.storagePath,
      userId: userId,
    });

    await this.clearStatsCache(userId);

    return document;
  }

  // --- READ: List documents with server-side pagination + filters ---
  async findAll(
    userId: string,
    page: number = 1,
    limit: number = 8,
    type?: string,
    status?: string,
    search?: string,
  ) {
    // deletedAt: null excludes soft-deleted documents from all listings
    const where: any = { userId, deletedAt: null };
    if (type)   where.type   = type;
    if (status) where.status = status;
    if (search) where.originalName = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.document.count({ where }),
    ]);

    return { data, total };
  }

  // --- READ: Analytics for the enhanced dashboard ---
  async getAnalytics(userId: string) {
    const cacheKey = `analytics:${userId}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      docsPerDay,
      docsByType,
      docsByStatus,
      confidenceRows,
      totalCount,
      validatedCount,
      rejectedCount,
      thisWeekCount,
      lastWeekCount,
      avgProcessingTime,
    ] = await Promise.all([
      // Documents per day (last 30 days)
      this.prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT DATE("createdAt") as date, COUNT(*)::bigint as count
        FROM "Document"
        WHERE "userId" = ${userId} AND "deletedAt" IS NULL
          AND "createdAt" >= ${thirtyDaysAgo}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      // Documents by type
      this.prisma.$queryRaw<{ type: string; count: bigint }[]>`
        SELECT "type", COUNT(*)::bigint as count
        FROM "Document"
        WHERE "userId" = ${userId} AND "deletedAt" IS NULL
        GROUP BY "type"
      `,
      // Documents by status
      this.prisma.$queryRaw<{ status: string; count: bigint }[]>`
        SELECT "status", COUNT(*)::bigint as count
        FROM "Document"
        WHERE "userId" = ${userId} AND "deletedAt" IS NULL
        GROUP BY "status"
      `,
      // Confidence distribution
      this.prisma.$queryRaw<{ bucket: string; count: bigint }[]>`
        SELECT
          CASE
            WHEN ed."confidence" < 20 THEN '0-20'
            WHEN ed."confidence" < 40 THEN '20-40'
            WHEN ed."confidence" < 60 THEN '40-60'
            WHEN ed."confidence" < 80 THEN '60-80'
            ELSE '80-100'
          END as bucket,
          COUNT(*)::bigint as count
        FROM "ExtractedData" ed
        JOIN "Document" d ON d."id" = ed."documentId"
        WHERE d."userId" = ${userId} AND d."deletedAt" IS NULL
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
      // KPI: total
      this.prisma.document.count({ where: { userId, deletedAt: null } }),
      // KPI: validated
      this.prisma.document.count({ where: { userId, deletedAt: null, status: 'VALIDATED' } }),
      // KPI: rejected
      this.prisma.document.count({ where: { userId, deletedAt: null, status: 'REJECTED' } }),
      // KPI: this week count
      this.prisma.document.count({ where: { userId, deletedAt: null, createdAt: { gte: thisWeekStart } } }),
      // KPI: last week count
      this.prisma.document.count({
        where: {
          userId,
          deletedAt: null,
          createdAt: { gte: lastWeekStart, lt: thisWeekStart },
        },
      }),
      // KPI: avg processing time (seconds between PENDING creation and REVIEW_REQUIRED/VALIDATED)
      this.prisma.$queryRaw<{ avg_seconds: number | null }[]>`
        SELECT AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")))::float as avg_seconds
        FROM "Document"
        WHERE "userId" = ${userId} AND "deletedAt" IS NULL
          AND "status" IN ('REVIEW_REQUIRED', 'VALIDATED', 'REJECTED')
      `,
    ]);

    // Serialize bigints and build result
    const serializeRows = (rows: { [key: string]: any }[]) =>
      rows.map((r) => {
        const obj: any = {};
        for (const [k, v] of Object.entries(r)) {
          obj[k] = typeof v === 'bigint' ? Number(v) : v instanceof Date ? v.toISOString().split('T')[0] : v;
        }
        return obj;
      });

    const pendingReview = docsByStatus.find((r) => r.status === 'REVIEW_REQUIRED');
    const avgConfidenceData = await this.prisma.extractedData.findMany({
      where: { document: { userId, deletedAt: null } },
      select: { confidence: true },
    });
    const avgConfidence =
      avgConfidenceData.length > 0
        ? Math.round(avgConfidenceData.reduce((sum, d) => sum + d.confidence, 0) / avgConfidenceData.length)
        : 0;

    const result = {
      docsPerDay: serializeRows(docsPerDay),
      docsByType: serializeRows(docsByType),
      docsByStatus: serializeRows(docsByStatus),
      confidenceDistribution: serializeRows(confidenceRows),
      kpis: {
        total: totalCount,
        pendingReview: pendingReview ? Number(pendingReview.count) : 0,
        avgConfidence,
        validationRate: totalCount > 0 ? Math.round((validatedCount / totalCount) * 100) : 0,
        rejectionRate: totalCount > 0 ? Math.round((rejectedCount / totalCount) * 100) : 0,
        avgProcessingTimeSec: avgProcessingTime[0]?.avg_seconds ? Math.round(avgProcessingTime[0].avg_seconds) : 0,
        thisWeekCount,
        lastWeekCount,
      },
    };

    await this.cache.set(cacheKey, result, 60);
    return result;
  }

  // --- READ: Aggregate stats for the dashboard ---
  async getStats(userId: string) {
    // 1. Check Redis cache first
    const cacheKey = `stats:${userId}`;
    const cached = await this.cache.get<{ total: number; pendingReview: number; avgConfidence: number }>(cacheKey);
    if (cached) return cached;  // Cache hit — skip Postgres entirely

    // 2. Cache miss — query Postgres
    const [total, pendingReview, extractionData] = await Promise.all([
      this.prisma.document.count({
        where: { userId, deletedAt: null },
      }),
      this.prisma.document.count({
        where: { userId, status: 'REVIEW_REQUIRED', deletedAt: null },
      }),
      this.prisma.extractedData.findMany({
        where: { document: { userId, deletedAt: null } },
        select: { confidence: true },
      }),
    ]);

    const avgConfidence =
      extractionData.length > 0
        ? Math.round(
            extractionData.reduce((sum, d) => sum + d.confidence, 0) /
              extractionData.length,
          )
        : 0;

    const stats = { total, pendingReview, avgConfidence };

    // 3. Store in Redis with 30s TTL
    await this.cache.set(cacheKey, stats, 30);

    return stats;
  }

  // --- READ: Get specific document details ---
  async findOne(id: string, userId: string) {
    const document = await this.prisma.document.findFirst({
      // deletedAt: null — prevent accessing a soft-deleted document by direct URL
      where: { id, userId, deletedAt: null },
      include: {
        extractedData: true,
        auditLogs: { orderBy: { timestamp: 'desc' } },
      },
    });

    if (!document) throw new NotFoundException('Document not found');
    return document;
  }

  // --- DELETE: Soft delete — marks the document as deleted without removing the row ---
  async deleteDocument(id: string, userId: string) {
    // Verify ownership first
    const document = await this.prisma.document.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!document) throw new NotFoundException('Document not found');

    // Set deletedAt instead of using prisma.document.delete()
    // This preserves the row and all related audit logs in the database
    await this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Log the deletion — this audit log survives because documentId is still set
    await this.audit.logAction({
      userId,
      documentId: id,
      action: 'DELETE_DOC',
      description: `User deleted document: ${document.originalName}`,
    });

    await this.clearStatsCache(userId);

    return { message: 'Document deleted successfully' };
  }

  // --- REJECT: Mark a document as rejected by the reviewer ---
  async rejectDocument(id: string, userId: string, reason?: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!document) throw new NotFoundException('Document not found');

    await this.prisma.document.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    await this.audit.logAction({
      userId,
      documentId: id,
      action: 'VALIDATE_DOC',
      description: reason
        ? `User rejected document: ${reason}`
        : 'User rejected document',
    });

    await this.clearStatsCache(userId);

    return { message: 'Document rejected' };
  }

  // --- UPDATE: Human-in-the-Loop Data Correction ---
  async updateExtractedData(id: string, userId: string, newData: any) {
    const document = await this.prisma.document.findFirst({
      where: { id, userId, deletedAt: null },
      include: { extractedData: true },
    });

    if (!document) throw new NotFoundException('Document not found');

    const schema = getPayloadSchema(document.type);
    const validation = schema.safeParse(newData);

    if (!validation.success) {
      throw new BadRequestException({
        message: 'Invalid data format',
        errors: validation.error.format(),
      });
    }

    const oldPayload = document.extractedData?.payload || {};

    return this.prisma.$transaction(async (tx) => {
      const updatedData = await tx.extractedData.upsert({
        where: { documentId: id },
        update: { payload: newData, confidence: 100 },
        create: { documentId: id, payload: newData, confidence: 100 },
      });

      await tx.document.update({
        where: { id },
        data: { status: 'VALIDATED' },
      });

      await this.audit.logAction({
        userId,
        documentId: id,
        action: 'UPDATE_FIELD',
        description: `User validated and corrected extracted data`,
        oldValue: oldPayload,
        newValue: newData,
      });

      await this.clearStatsCache(userId);

      return updatedData;
    });
  }
    // =============================================
  // BATCH OPERATIONS
  // =============================================
 

  
  async batchValidate(userId: string, documentIds: string[]) {
    // Step 1: Fetch all documents that belong to this user AND are not deleted
    //         We use `in` to get them all in a single SQL query
    const documents = await this.prisma.document.findMany({
      where: {
        id: { in: documentIds },   // SQL: WHERE id IN ('uuid1', 'uuid2', ...)
        userId,                      // Must belong to this user (ownership check)
        deletedAt: null,             // Exclude soft-deleted documents
      },
    });

    // Step 2: Filter to only REVIEW_REQUIRED docs — others are skipped silently
    const eligible = documents.filter((d) => d.status === 'REVIEW_REQUIRED');

    if (eligible.length === 0) {
      return { validated: 0, skipped: documentIds.length };
    }

    // Step 3: Wrap all writes in a transaction
    await this.prisma.$transaction(async (tx) => {
      // updateMany is more efficient than looping update() for each doc
      // It generates a single SQL UPDATE ... WHERE id IN (...) statement
      await tx.document.updateMany({
        where: { id: { in: eligible.map((d) => d.id) } },
        data: { status: 'VALIDATED' },
      });

      // But we still need individual audit logs — each doc gets its own entry
      // so the audit trail shows exactly which documents were validated
      for (const doc of eligible) {
        await this.audit.logAction({
          userId,
          documentId: doc.id,
          action: 'VALIDATE_DOC',
          description: `Batch validated: ${doc.originalName}`,
        });
      }
    });

    // Step 4: Clear cache once — not inside the loop
    await this.clearStatsCache(userId);

    return { validated: eligible.length, skipped: documentIds.length - eligible.length };
  }

  
  async batchReject(userId: string, documentIds: string[], reason?: string) {
    const documents = await this.prisma.document.findMany({
      where: { id: { in: documentIds }, userId, deletedAt: null },
    });

    const eligible = documents.filter((d) => d.status === 'REVIEW_REQUIRED');

    if (eligible.length === 0) {
      return { rejected: 0, skipped: documentIds.length };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.document.updateMany({
        where: { id: { in: eligible.map((d) => d.id) } },
        data: { status: 'REJECTED' },
      });

      for (const doc of eligible) {
        await this.audit.logAction({
          userId,
          documentId: doc.id,
          action: 'VALIDATE_DOC', // Same audit action as single reject
          description: reason
            ? `Batch rejected: ${reason}`
            : `Batch rejected: ${doc.originalName}`,
        });
      }
    });

    await this.clearStatsCache(userId);

    return { rejected: eligible.length, skipped: documentIds.length - eligible.length };
  }

  
  async batchDelete(userId: string, documentIds: string[]) {
    // Find all non-deleted docs belonging to this user
    const documents = await this.prisma.document.findMany({
      where: { id: { in: documentIds }, userId, deletedAt: null },
    });

    if (documents.length === 0) {
      return { deleted: 0 };
    }

    await this.prisma.$transaction(async (tx) => {
      // Set deletedAt on all matched documents in one SQL statement
      await tx.document.updateMany({
        where: { id: { in: documents.map((d) => d.id) } },
        data: { deletedAt: new Date() },
      });

      for (const doc of documents) {
        await this.audit.logAction({
          userId,
          documentId: doc.id,
          action: 'DELETE_DOC',
          description: `Batch deleted: ${doc.originalName}`,
        });
      }
    });

    await this.clearStatsCache(userId);

    return { deleted: documents.length };
  }

  
  async batchExport(userId: string, documentIds: string[]) {
    // Fetch all validated, non-deleted docs with their extracted data
    const documents = await this.prisma.document.findMany({
      where: {
        id: { in: documentIds },
        userId,
        deletedAt: null,
        status: 'VALIDATED',
      },
      include: {
        extractedData: true,
        user: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (documents.length === 0) {
      return { buffer: null, count: 0 };
    }

    // We import pdfkit here to build one combined PDF
    const PDFDocument = require('pdfkit');
    const pdf = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    const result: Buffer = await new Promise((resolve, reject) => {
      pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdf.on('end', () => resolve(Buffer.concat(chunks)));
      pdf.on('error', reject);

      // Cover page
      pdf
        .fontSize(24).font('Helvetica-Bold').text('AgriDoc AI', { align: 'center' })
        .fontSize(14).font('Helvetica').fillColor('#666666')
        .text('Batch Export Report', { align: 'center' })
        .moveDown(0.5)
        .fontSize(10).text(`${documents.length} document(s) · Generated ${new Date().toLocaleDateString('en-GB')}`, { align: 'center' })
        .moveDown(2);

      // Table of contents
      pdf.fillColor('#000000').fontSize(14).font('Helvetica-Bold').text('Documents Included:');
      pdf.moveDown(0.5);
      documents.forEach((doc, i) => {
        pdf.fontSize(10).font('Helvetica').fillColor('#374151')
          .text(`${i + 1}. ${doc.originalName} (${doc.type})`);
      });

      // One section per document (each starts on a new page)
      for (const doc of documents) {
        pdf.addPage();

        // Document header
        pdf.fontSize(16).font('Helvetica-Bold').fillColor('#000000').text(doc.originalName);
        pdf.fontSize(10).font('Helvetica').fillColor('#666666')
          .text(`Type: ${doc.type} · Uploaded: ${new Date(doc.createdAt).toLocaleDateString('en-GB')}`);
        pdf.moveDown(1);

        // Confidence
        const confidence = doc.extractedData?.confidence ?? 0;
        pdf.fontSize(10).font('Helvetica-Bold').fillColor('#374151')
          .text(`Confidence: ${confidence}%`);
        pdf.moveDown(0.5);

        // Extracted data fields
        const payload = (doc.extractedData?.payload ?? {}) as Record<string, unknown>;
        for (const [key, value] of Object.entries(payload)) {
          if (pdf.y > pdf.page.height - 100) pdf.addPage();

          const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();

          if (Array.isArray(value)) {
            pdf.fontSize(10).font('Helvetica-Bold').fillColor('#374151').text(`${label}:`);
            for (const item of value) {
              pdf.fontSize(9).font('Helvetica').fillColor('#000000');
              if (typeof item === 'object' && item !== null) {
                const parts = Object.entries(item as Record<string, unknown>).map(([k, v]) => `${k}: ${v}`).join(' | ');
                pdf.text(`  - ${parts}`);
              } else {
                pdf.text(`  - ${item}`);
              }
            }
          } else {
            pdf.fontSize(10).font('Helvetica-Bold').fillColor('#374151').text(`${label}: `, { continued: true });
            pdf.font('Helvetica').fillColor('#000000').text(String(value ?? ''));
          }
        }
      }

      // Footer on all pages
      const pageCount = pdf.bufferedPageRange();
      for (let i = 0; i < pageCount.count; i++) {
        pdf.switchToPage(i);
        const footerY = pdf.page.height - 50;
        pdf.strokeColor('#e5e7eb').lineWidth(0.5)
          .moveTo(50, footerY).lineTo(pdf.page.width - 50, footerY).stroke();
        pdf.fontSize(8).font('Helvetica').fillColor('#9ca3af')
          .text(`Generated by AgriDoc AI · ${new Date().toLocaleString('en-GB')}`, 50, footerY + 10, { width: pdf.page.width - 150, align: 'left' })
          .text(`Page ${i + 1} of ${pageCount.count}`, 50, footerY + 10, { width: pdf.page.width - 100, align: 'right' });
      }

      pdf.end();

      // Log export for each document (fire-and-forget)
      for (const doc of documents) {
        this.audit.logAction({
          userId,
          documentId: doc.id,
          action: 'EXPORT',
          description: `Batch exported: ${doc.originalName}`,
        }).catch(() => {});
      }
    });

    return { buffer: result, count: documents.length };
  }

  // --- CALLBACK: Receive extraction results from the AI service ---
  async handleExtractionCallback(
    documentId: string,
    dto: { payload: Record<string, any>; confidence: number; rawText?: string },
  ) {
    // 1. Check the document exists and is currently being processed
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) throw new NotFoundException('Document not found');

    // 2. Save extracted data + update status in one transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.extractedData.upsert({
        where: { documentId },
        update: { payload: dto.payload, confidence: dto.confidence },
        create: { documentId, payload: dto.payload, confidence: dto.confidence },
      });

      await tx.document.update({
        where: { id: documentId },
        data: { status: 'REVIEW_REQUIRED' },
      });
    });

    // 3. Audit trail — record that AI extraction completed
    await this.audit.logAction({
      documentId,
      userId: document.userId,
      action: 'AUTO_EXTRACT',
      description: `AI extraction complete. Confidence: ${dto.confidence}%`,
      newValue: dto.payload,
    });

    await this.clearStatsCache(document.userId);

    return { message: 'Extraction saved', documentId };
  }
  // --- ERROR CALLBACK: AI service reports a processing failure ---
  async handleExtractionError(documentId: string, error: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) throw new NotFoundException('Document not found');

    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: 'ERROR' },
    });

    await this.audit.logAction({
      documentId,
      userId: document.userId,
      action: 'AUTO_EXTRACT',
      description: `AI extraction failed: ${error}`,
    });

    await this.clearStatsCache(document.userId);

    return { message: 'Error recorded', documentId };
  }

}
