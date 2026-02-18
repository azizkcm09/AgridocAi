import { ApiProperty } from '@nestjs/swagger';

export class CreateDocumentDto {
  @ApiProperty({
    type: 'string',
    format: 'binary', // 👈 This tells Swagger: "This is a File Upload!"
    description: 'PDF or Image file to be processed by AI',
  })
  file: any;
}