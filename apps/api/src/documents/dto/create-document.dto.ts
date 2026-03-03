import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty({ example: 'invoice-january.pdf', description: 'The original name of the file' })
  @IsString()
  @IsNotEmpty()
  originalName: string;

  @ApiProperty({ example: 'uploads/12345-invoice-january.pdf', description: 'The exact key/path in MinIO' })
  @IsString()
  @IsNotEmpty()
  storagePath: string;

  @ApiProperty({ example: 'application/pdf', description: 'The MIME type of the file' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({ example: 1024500, description: 'File size in bytes' })
  @IsNumber()
  @IsNotEmpty()
  size: number;
}