import { Controller, Get, Param, Query, UseGuards, Req, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../auth/roles.enum';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('audit')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  // --- GET /audit — paginated list for the Audit Logs page ---
  @Get()
  @ApiOperation({ summary: 'List all audit logs (paginated)' })
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
  ) {
    return this.auditService.findAll(
      req.user.userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      action,
    );
  }

  // --- GET /audit/recent — dashboard widget ---
  @Get('recent')
  @ApiOperation({ summary: 'Get recent logs for dashboard' })
  async getUserRecentLogs(@Req() req: any) {
    return this.auditService.getUserRecentLogs(req.user.userId);
  }

  // --- GET /audit/document/:documentId — full history for one document ---
  @Get('document/:documentId')
  @ApiOperation({ summary: 'Get history for a specific document' })
  async getDocumentHistory(@Param('documentId') documentId: string, @Req() req: any) {
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.userId !== req.user.userId && req.user.role !== Role.ADMIN) {
      throw new ForbiddenException('You do not have access to this document');
    }
    return this.auditService.getDocumentHistory(documentId);
  }
}
