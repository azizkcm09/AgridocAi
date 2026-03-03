import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { BadRequestException } from '@nestjs/common';
import { getPayloadSchema } from './dto/extraction.schema';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService, // Injecting the Audit Service we built earlier
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
        type: 'UNKNOWN',
      },
    });

    // 2. Trigger the internal Audit Log!
    await this.audit.logAction({
      userId,
      documentId: document.id,
      action: 'UPLOAD',
      description: `User synced uploaded file: ${dto.originalName}`,
    });

    return document;
  }

  // --- READ: List all documents for a user ---
  async findAll(userId: string) {
    return this.prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
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