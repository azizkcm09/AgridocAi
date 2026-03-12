import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async logAction(params: {
    userId?: string;
    documentId: string;
    action: AuditAction;
    description?: string;
    oldValue?: any;
    newValue?: any;
  }) {
    return this.prisma.auditLog.create({
      data: {
        action: params.action,
        description: params.description,
        documentId: params.documentId,
        userId: params.userId,
        oldValue: params.oldValue,
        newValue: params.newValue,
      },
    });
  }

  // --- READ: Get history for a specific document ---
  async getDocumentHistory(documentId: string) {
    return this.prisma.auditLog.findMany({
      where: { documentId },
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { email: true } },
      },
    });
  }

  // --- READ: Get recent logs for a user (Dashboard widget) ---
  async getUserRecentLogs(userId: string, limit: number = 5) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        document: { select: { originalName: true } },
      },
    });
  }

  // --- READ: Paginated audit logs for the full Audit Logs page ---
  async findAll(
    userId: string,
    page: number = 1,
    limit: number = 10,
    action?: string,
  ) {
    const where: any = { userId };
    if (action) where.action = action;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          document: { select: { originalName: true, type: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total };
  }
}
