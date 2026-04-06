import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../auth/roles.enum';
import { DocumentStatus, DocumentType } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ─── USERS ───────────────────────────────────────────────────────────────

  async findAllUsers(page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: { select: { documents: true } },
        },
      }),
      this.prisma.user.count(),
    ]);
    return { data, total };
  }

  async findUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: { select: { documents: true, auditLogs: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateRole(id: string, role: Role) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, role: true, isActive: true },
    });
  }

  async toggleActive(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, email: true, role: true, isActive: true },
    });
  }

  // ─── DOCUMENTS ───────────────────────────────────────────────────────────

  async findAllDocuments(
    page: number,
    limit: number,
    filters: { type?: DocumentType; status?: DocumentStatus; userId?: string; search?: string },
  ) {
    const where: any = { deletedAt: null };
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.userId) where.userId = filters.userId;
    if (filters.search) {
      where.originalName = { contains: filters.search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, name: true } },
          extractedData: { select: { confidence: true } },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return { data, total };
  }

  // ─── AUDIT ───────────────────────────────────────────────────────────────

  async findAllAuditLogs(page: number, limit: number, action?: string) {
    const where: any = {};
    if (action) where.action = action;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          user: { select: { email: true, name: true } },
          document: { select: { originalName: true, type: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total };
  }

  // ─── ANALYTICS ───────────────────────────────────────────────────────────

  async getAnalytics() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const [
      totalUsers,
      activeUsers,
      totalDocuments,
      validatedDocuments,
      rejectedDocuments,
      pendingDocuments,
      processingDocuments,
      errorDocuments,
      byType,
    ] = await Promise.all([
      // User counts
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),

      // Document counts (exclude soft-deleted)
      this.prisma.document.count({ where: { deletedAt: null } }),
      this.prisma.document.count({ where: { deletedAt: null, status: 'VALIDATED' } }),
      this.prisma.document.count({ where: { deletedAt: null, status: 'REJECTED' } }),
      this.prisma.document.count({ where: { deletedAt: null, status: 'PENDING' } }),
      this.prisma.document.count({ where: { deletedAt: null, status: 'PROCESSING' } }),
      this.prisma.document.count({ where: { deletedAt: null, status: 'ERROR' } }),

      // Breakdown by type
      this.prisma.document.groupBy({
        by: ['type'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),

    ]);

    // Raw query: group by calendar day (DATE trunc) instead of exact timestamp
    // Prisma groupBy can't truncate datetime fields, so a raw query is required here
    const recentVolume: { date: string; count: bigint }[] = await this.prisma.$queryRaw`
      SELECT DATE("createdAt") AS date, COUNT(*) AS count
      FROM "Document"
      WHERE "deletedAt" IS NULL
        AND "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY DATE("createdAt") ASC
    `;

    const validationRate =
      totalDocuments > 0 ? Math.round((validatedDocuments / totalDocuments) * 100) : 0;

    return {
      users: { total: totalUsers, active: activeUsers },
      documents: {
        total: totalDocuments,
        validated: validatedDocuments,
        rejected: rejectedDocuments,
        pending: pendingDocuments,
        processing: processingDocuments,
        error: errorDocuments,
        validationRate,
      },
      byType: byType.map((b) => ({ type: b.type, count: b._count._all })),
      recentVolume: recentVolume.map((v) => ({
        date: v.date,
        count: Number(v.count),
      })),
    };
  }
}
