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
    private audit: AuditService, // Injecting the Audit Service we built earlier
    @InjectQueue('document-processing') private documentQueue: Queue,
  ) {}

  // --- CREATE: Save metadata after MinIO upload ---
  async createDocument(userId: string, dto: CreateDocumentDto) {
    // 1. Save the record in PostgreSQL
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

    // 2. Trigger the internal Audit Log!
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
    // Build the WHERE clause dynamically based on which filters were provided
    const where: any = { userId };
    if (type)   where.type   = type;
    if (status) where.status = status;
    if (search) where.originalName = { contains: search, mode: 'insensitive' };

    // Run both queries at the same time: one for the page data, one for the total count
    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,  // how many rows to skip before this page
        take: limit,                // how many rows to return
      }),
      this.prisma.document.count({ where }),
    ]);

    return { data, total };
  }

  // --- READ: Get specific document details ---
  async findOne(id: string, userId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, userId },
      include: {
        extractedData: true,
        auditLogs: { orderBy: { timestamp: 'desc' } }, // Include history for the frontend
      },
    });

    if (!document) throw new NotFoundException('Document not found');
    return document;

  }
  // --- UPDATE: Human-in-the-Loop Data Correction ---
  async updateExtractedData(id: string, userId: string, newData: any) {
    // 1. Verify the document belongs to the user
    const document = await this.prisma.document.findFirst({
      where: { id, userId },
      include: { extractedData: true },
    });

    if (!document) throw new NotFoundException('Document not found');

    // 2. Validate the new data against our Zod schema
    const schema = getPayloadSchema(document.type);
    const validation = schema.safeParse(newData);
    
    if (!validation.success) {
      throw new BadRequestException({
        message: 'Invalid data format',
        errors: validation.error.format(),
      });
    }

    const oldPayload = document.extractedData?.payload || {};

    // 3. Database Transaction: Update Data, Change Status, Log Audit
    return this.prisma.$transaction(async (tx) => {
      // Upsert: Update if exists, Create if the AI worker hasn't made it yet
      const updatedData = await tx.extractedData.upsert({
        where: { documentId: id },
        update: { payload: newData, confidence: 100 }, // Human validated = 100%
        create: {
          documentId: id,
          payload: newData,
          confidence: 100,
        },
      });

      // Move document status forward
      await tx.document.update({
        where: { id },
        data: { status: 'VALIDATED' },
      });

      // Log the exact fields that changed
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