import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsUUID, IsOptional, IsString, ArrayMinSize } from 'class-validator';

/**
 * DTO for all batch operations (validate, reject, delete, export).
 */

export class BatchOperationDto {
  @ApiProperty({
    description: 'Array of document IDs to operate on',
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    type: [String],
  })
  @IsArray()                          // Must be an array
  @ArrayMinSize(1)                    // At least 1 document ID required
  @IsUUID('4', { each: true })       // Every element must be a valid UUID v4
  documentIds: string[];

  @ApiPropertyOptional({
    description: 'Reason for batch rejection (only used by batch reject)',
    example: 'Documents contain incorrect supplier data',
  })
  @IsOptional()                       // This field can be omitted entirely
  @IsString()                         // If provided, must be a string
  reason?: string;
}
