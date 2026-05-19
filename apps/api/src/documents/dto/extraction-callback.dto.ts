import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';
import {
  IsObject,
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  Min,
  Max,
} from 'class-validator';

export class ExtractionCallbackDto {
  @ApiProperty({
    example: { vendorName: 'Farm Fresh Ltd', totalAmount: 1500 },
    description: 'Extracted fields from the AI service',
  })
  @IsObject()
  payload: Record<string, any>;

  @ApiProperty({ example: 85, description: 'Extraction confidence 0-100' })
  @IsNumber()
  @Min(0)
  @Max(100)
  confidence: number;

  @ApiPropertyOptional({
    example: 'Invoice No: 12345\nVendor: Farm Fresh...',
    description: 'Raw OCR text for debugging',
  })
  @IsOptional()
  @IsString()
  rawText?: string;

  @ApiPropertyOptional({
    enum: DocumentType,
    description:
      'Document type chosen by the AI classifier (only set when the document was uploaded as UNKNOWN).',
  })
  @IsOptional()
  @IsEnum(DocumentType)
  detectedType?: DocumentType;

  @ApiPropertyOptional({
    example: 94,
    description: 'Classifier confidence 0-100 (only set when classification ran).',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  classificationConfidence?: number;
}
