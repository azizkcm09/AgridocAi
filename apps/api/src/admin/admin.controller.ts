import { Controller, Get, Patch, Param, Body, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { UpdateRoleDto } from './dto/update-role.dto';
import { DocumentStatus, DocumentType } from '@prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard) // JWT runs first, then role check
@Roles(Role.ADMIN)                   // Every route in this controller requires ADMIN
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── USERS ───────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List all users (admin)' })
  findAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.findAllUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search,
    );
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get a single user detail (admin)' })
  findUserById(@Param('id') id: string) {
    return this.adminService.findUserById(id);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Change a user role (admin)' })
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.adminService.updateRole(id, dto.role);
  }

  @Patch('users/:id/deactivate')
  @ApiOperation({ summary: 'Toggle user active/inactive (admin)' })
  toggleActive(@Param('id') id: string, @Req() req: any) {
    if (req.user.userId === id) {
      throw new BadRequestException('Cannot deactivate your own account');
    }
    return this.adminService.toggleActive(id);
  }

  // ─── DOCUMENTS ───────────────────────────────────────────────────────────

  @Get('documents')
  @ApiOperation({ summary: 'List all documents across all users (admin)' })
  findAllDocuments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: DocumentType,
    @Query('status') status?: DocumentStatus,
    @Query('userId') userId?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.findAllDocuments(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      { type, status, userId, search },
    );
  }

  // ─── AUDIT ───────────────────────────────────────────────────────────────

  @Get('audit')
  @ApiOperation({ summary: 'Platform-wide audit log (admin)' })
  findAllAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
  ) {
    return this.adminService.findAllAuditLogs(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      action,
    );
  }

  // ─── ANALYTICS ───────────────────────────────────────────────────────────

  @Get('analytics')
  @ApiOperation({ summary: 'Platform-wide analytics (admin)' })
  getAnalytics(@Query('range') range?: string) {
    const days = range ? parseInt(range) : 30;
    return this.adminService.getAnalytics(Math.min(Math.max(days, 1), 365));
  }
}
