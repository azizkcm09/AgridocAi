import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { PdfExportService } from './pdf-export.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { ExtractionCallbackDto } from './dto/extraction-callback.dto';
import { BatchOperationDto } from './dto/batch-operation.dto';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly pdfExportService: PdfExportService,
  ) {}

  // --- 1. CREATE: Sync metadata after successful MinIO upload ---
  @Post()
  @ApiOperation({ summary: 'Save document metadata after MinIO upload' })
  createDocument(@Body() createDocumentDto: CreateDocumentDto, @Req() req: any) {
    // We pass the userId from the JWT, and the JSON payload from the frontend
    return this.documentsService.createDocument(req.user.userId, createDocumentDto);
  }

  // --- 2. READ: List documents with pagination + filters ---
  @Get()
  @ApiOperation({ summary: 'List user documents with pagination and filters' })
  findAll(
    @Req() req: any,
    @Query('page')   page?:   string,
    @Query('limit')  limit?:  string,
    @Query('type')   type?:   string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    // Query params arrive as strings — convert page and limit to numbers
    return this.documentsService.findAll(
      req.user.userId,
      page   ? parseInt(page)  : 1,
      limit  ? parseInt(limit) : 8,
      type,
      status,
      search,
    );
  }

  // --- 3a. READ: Analytics for enhanced dashboard (MUST be before :id route)
  @Get('analytics')
  @ApiOperation({ summary: 'Get analytics: charts data + KPIs with week-over-week changes' })
  getAnalytics(@Req() req: any) {
    return this.documentsService.getAnalytics(req.user.userId);
  }

  // --- 3b. READ: Dashboard stats (MUST be before :id route or NestJS matches "stats" as an id)
  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard stats: total, pendingReview, avgConfidence' })
  getStats(@Req() req: any) {
    return this.documentsService.getStats(req.user.userId);
  }

  // =============================================
  // BATCH OPERATIONS — 
  // =============================================
  
  
  @Post('batch/validate')
  @ApiOperation({ summary: 'Batch validate multiple documents' })
  batchValidate(@Body() dto: BatchOperationDto, @Req() req: any) {
    return this.documentsService.batchValidate(req.user.userId, dto.documentIds);
  }

  
  @Post('batch/reject')
  @ApiOperation({ summary: 'Batch reject multiple documents' })
  batchReject(@Body() dto: BatchOperationDto, @Req() req: any) {
    return this.documentsService.batchReject(req.user.userId, dto.documentIds, dto.reason);
  }

  
  @Post('batch/delete')
  @ApiOperation({ summary: 'Batch soft-delete multiple documents' })
  batchDelete(@Body() dto: BatchOperationDto, @Req() req: any) {
    return this.documentsService.batchDelete(req.user.userId, dto.documentIds);
  }

  
  @Post('batch/export')
  @ApiOperation({ summary: 'Batch export validated documents as combined PDF' })
  async batchExport(@Body() dto: BatchOperationDto, @Req() req: any, @Res() res: Response) {
    const { buffer, count } = await this.documentsService.batchExport(req.user.userId, dto.documentIds);

    if (!buffer) {
      // No validated documents found — return JSON error instead of empty PDF
  
      res.status(400).json({ message: 'No validated documents to export' });
      return;
    }

    // Set response headers for a PDF download
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="agridoc-batch-export-${count}-docs.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer); // Send the binary PDF buffer
  }

  // --- 4. CALLBACK: Receive AI extraction results (service-to-service) ---
  @Public() // This endpoint is called by the AI service, so it must be public (no JWT required)
  @Post(':id/extraction-callback')

  @ApiOperation({ summary: 'Callback from AI service with extraction results' })
  handleExtractionCallback(
    @Param('id') id: string,
    @Body() dto: ExtractionCallbackDto,
  ) {
    return this.documentsService.handleExtractionCallback(id, dto);
  }
    // --- 5. ERROR CALLBACK: AI service reports processing failure ---
  @Public()
  @Post(':id/extraction-error')
  @ApiOperation({ summary: 'Error callback from AI service' })
  handleExtractionError(
    @Param('id') id: string,
    @Body() body: { error: string },
  ) {
    return this.documentsService.handleExtractionError(id, body.error);
  }


  // --- 6. EXPORT: Generate PDF report for a validated document ---
  @Get(':id/export')
  @ApiOperation({ summary: 'Export validated document as PDF report' })
  async exportPdf(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const buffer = await this.pdfExportService.generateReport(id, req.user.userId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="agridoc-report-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // --- 7. READ: Get one document ---
  @Get(':id')
  @ApiOperation({ summary: 'Get specific document details' })
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.documentsService.findOne(id, req.user.userId);
  }
  // --- 7. DELETE: Soft delete — marks deletedAt, preserves audit logs ---
  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a document (audit logs are preserved)' })
  deleteDocument(@Param('id') id: string, @Req() req: any) {
    return this.documentsService.deleteDocument(id, req.user.userId);
  }

  // --- 8. REJECT: Mark document as rejected by reviewer ---
  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a document (HITL review)' })
  rejectDocument(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() req: any,
  ) {
    return this.documentsService.rejectDocument(id, req.user.userId, body.reason);
  }

  // --- 9. UPDATE: HITL Data Correction ---
  @Patch(':id/data')
  @ApiOperation({ summary: 'Update Extracted Data (Human-in-the-Loop)' })
  updateData(
    @Param('id') id: string,
    @Body() updateDataDto: any,
    @Req() req: any,
  ) {
    return this.documentsService.updateExtractedData(id, req.user.userId, updateDataDto);
  }

  // --- 10. Mark a field as N/A ---
  @Patch(':id/field-override')
  @ApiOperation({ summary: 'Mark a field as N/A (not applicable on this document)' })
  setFieldOverride(
    @Param('id') id: string,
    @Body() body: { fieldKey: string; reason: string },
    @Req() req: any,
  ) {
    return this.documentsService.setFieldOverride(id, req.user.userId, body.fieldKey, body.reason);
  }

  // --- 11. Remove an N/A override ---
  @Delete(':id/field-override/:fieldKey')
  @ApiOperation({ summary: 'Remove N/A override from a field' })
  removeFieldOverride(
    @Param('id') id: string,
    @Param('fieldKey') fieldKey: string,
    @Req() req: any,
  ) {
    return this.documentsService.removeFieldOverride(id, req.user.userId, fieldKey);
  }
}