import { Controller, Post, Get, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { GenerateUrlDto } from './generate-url.dto';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('presigned-url')
  async getUploadUrl(@Body() body: GenerateUrlDto) {
    return this.storageService.getPresignedUploadUrl(body.fileName, body.contentType);
  }

  @Get('download-url')
  async getDownloadUrl(@Query('key') key: string) {
    if (!key || key.includes('..')) {
      throw new BadRequestException('Invalid storage key');
    }
    return this.storageService.getPresignedDownloadUrl(key);
  }
}