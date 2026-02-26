import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { StorageService } from './storage.service';
import { GenerateUrlDto } from './generate-url.dto';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('presigned-url')
  @UsePipes(new ValidationPipe({ whitelist: true })) // Enables validation
  async getUploadUrl(@Body() body: GenerateUrlDto) {
    return this.storageService.getPresignedUploadUrl(body.fileName, body.contentType);
  }
}