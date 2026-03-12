import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { BadRequestException } from '@nestjs/common';
import { getPayloadSchema } from './dto/extraction.schema';
import type { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq/dist/decorators/inject-queue.decorator';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    @InjectQueue('document-processing') private documentQueue: Queue,
  ) {}

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

  // --- READ: Aggregate stats for the dashboard ---
  async getStats(userId: string) {
    // deletedAt: null — soft-deleted documents don't count in stats
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

    return { total, pendingReview, avgConfidence };
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

    return { message: 'Document deleted successfully' };
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

      return updatedData;
    });
  }
}
