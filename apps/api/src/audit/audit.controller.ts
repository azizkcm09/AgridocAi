import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@ApiBearerAuth() 
@UseGuards(AuthGuard('jwt')) //  THE SHIELD: No valid token = No access
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // --- GET /audit/document/:documentId ---
  @Get('document/:documentId')
  @ApiOperation({ summary: 'Get history for a specific document' })
  async getDocumentHistory(@Param('documentId') documentId: string) {
    return this.auditService.getDocumentHistory(documentId);
  }

  // --- GET /audit/recent ---
  @Get('recent')
  @ApiOperation({ summary: 'Get recent logs for dashboard' })
  async getUserRecentLogs(@Req() req: any) {
    // We extract the userId directly from the verified JWT token (req.user)
    // This ensures a user can ONLY see their own recent activity.
    return this.auditService.getUserRecentLogs(req.user.userId);
  }
}