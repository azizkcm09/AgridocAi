import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsNotEmpty, IsOptional, IsEnum, Min, Matches } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class CreateDocumentDto {
  @ApiProperty({ example: 'invoice-january.pdf', description: 'The original name of the file' })
  @IsString()
  @IsNotEmpty()
  originalName: string;

  @ApiProperty({ example: 'uploads/12345-invoice-january.pdf', description: 'The exact key/path in MinIO' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9\/_.-]+$/, { message: 'storagePath contains invalid characters' })
  storagePath: string;

  @ApiProperty({ example: 'application/pdf', description: 'The MIME type of the file' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({ example: 1024500, description: 'File size in bytes' })
  @IsNumber()
  @Min(1, { message: 'File size must be at least 1 byte' })
  size: number;

  @ApiPropertyOptional({ enum: DocumentType, example: 'INVOICE', description: 'Document type for AI extraction routing' })
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;
}