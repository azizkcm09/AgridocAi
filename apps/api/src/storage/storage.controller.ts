import { Controller, Post, Get, Body, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { StorageService } from './storage.service';
import { GenerateUrlDto } from './generate-url.dto';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('presigned-url')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async getUploadUrl(@Body() body: GenerateUrlDto) {
    return this.storageService.getPresignedUploadUrl(body.fileName, body.contentType);
  }

  // GET /storage/download-url?key=documents/1234-invoice.pdf
  // Returns a presigned URL (15 min) for the browser to fetch the file from MinIO directly.
  @Get('download-url')
  async getDownloadUrl(@Query('key') key: string) {
    return this.storageService.getPresignedDownloadUrl(key);
  }
}