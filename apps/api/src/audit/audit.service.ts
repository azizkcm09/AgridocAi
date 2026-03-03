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
// --- READ: Get history for a specific document (For the Review Screen) ---
  async getDocumentHistory(documentId: string) {
    return this.prisma.auditLog.findMany({
      where: { documentId },
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { email: true } } // Includes the email of who made the change
      }
    });
  }

  // --- READ: Get recent logs for a user (For the Dashboard) ---
  async getUserRecentLogs(userId: string, limit: number = 5) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        document: { select: { originalName: true } }
      }
    });
  }
}