import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  UseInterceptors, 
  UploadedFile, 
  UseGuards 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CreateDocumentDto } from './dto/create-document.dto';
import { AuthGuard } from '@nestjs/passport';
import { DocumentsService } from './documents.service';

@ApiTags('Documents') // 1. Group under "Documents"
@ApiBearerAuth()      // 2. Require Login for all these routes
@UseGuards(AuthGuard('jwt'))
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // --- 1. UPLOAD ENDPOINT ---
  @Post('upload')
  @ApiOperation({ summary: 'Upload Document', description: 'Upload a PDF or Image. Triggers AI extraction.' })
  @ApiConsumes('multipart/form-data') // 👈 Critical for File Uploads in Swagger
  @ApiBody({
    description: 'The file to upload',
    type: CreateDocumentDto,
  })
  @UseInterceptors(FileInterceptor('file')) // Handles the file parsing
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    // Mock response for now (Design Phase)
    return { 
      message: 'File received successfully (Mock)', 
      filename: file?.originalname,
      size: file?.size
    };
  }

  // --- 2. LIST ALL ENDPOINT ---
  @Get()
  @ApiOperation({ summary: 'List My Documents', description: 'Get all documents uploaded by the current user.' })
  @ApiResponse({ status: 200, description: 'List of documents returned successfully.' })
  findAll() {
    return this.documentsService.findAll();
  }

  // --- 3. GET ONE ENDPOINT ---
  @Get(':id')
  @ApiOperation({ summary: 'Get Document Details', description: 'Get metadata and extracted data for a specific document.' })
  @ApiResponse({ status: 200, description: 'Document found.' })
  @ApiResponse({ status: 404, description: 'Document not found.' })
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(+id);
  }
}