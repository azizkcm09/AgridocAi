import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class ExtractionCallbackDto {
  @ApiProperty({
    example: { vendorName: 'Farm Fresh Ltd', totalAmount: 1500 },
    description: 'Extracted fields from the AI service',
  })
  @IsObject()
  payload: Record<string, any>;

  @ApiProperty({ example: 85, description: 'Confidence score 0-100' })
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
}
