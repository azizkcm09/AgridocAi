import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe', description: 'Display name' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'oldPass123', description: 'Current password for verification' })
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @ApiProperty({ example: 'newPass456', description: 'New password (min 6 characters)' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
