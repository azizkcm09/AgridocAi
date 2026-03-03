import { 
  Controller, 
  Get, 
  Post,
  Patch, 
  Body, 
  Param, 
  UseGuards, 
  Req 
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt')) //  The JWT Shield is active here
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // --- 1. CREATE: Sync metadata after successful MinIO upload ---
  @Post()
  @ApiOperation({ summary: 'Save document metadata after MinIO upload' })
  createDocument(@Body() createDocumentDto: CreateDocumentDto, @Req() req: any) {
    // We pass the userId from the JWT, and the JSON payload from the frontend
    return this.documentsService.createDocument(req.user.userId, createDocumentDto);
  }

  // --- 2. READ: List all documents ---
  @Get()
  @ApiOperation({ summary: 'List all user documents' })
  findAll(@Req() req: any) {
    // Passes the exact userId to the service to fix Error 1
    return this.documentsService.findAll(req.user.userId);
  }

  // --- 3. READ: Get one document ---
  @Get(':id')
  @ApiOperation({ summary: 'Get specific document details' })
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.documentsService.findOne(id, req.user.userId);
  }
  // --- 4. UPDATE: HITL Data Correction ---
  @Patch(':id/data')
  @ApiOperation({ summary: 'Update Extracted Data (Human-in-the-Loop)' })
  updateData(
    @Param('id') id: string, 
    @Body() updateDataDto: any, 
    @Req() req: any
  ) {
    return this.documentsService.updateExtractedData(id, req.user.userId, updateDataDto);
  }
}