import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { StorageService } from '../storage/storage.service';
import { UpdateProfileDto, ChangePasswordDto } from './dto/update-profile.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly storageService: StorageService,
  ) {}

  // GET /users/profile — return the current user's profile
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@Req() req: any) {
    return this.usersService.findById(req.user.userId);
  }

  // PATCH /users/profile — update name
  @Patch('profile')
  @ApiOperation({ summary: 'Update profile (name)' })
  updateProfile(@Body() dto: UpdateProfileDto, @Req() req: any) {
    return this.usersService.updateProfile(req.user.userId, { name: dto.name });
  }

  // POST /users/avatar — get a presigned upload URL for the avatar image
  @Post('avatar')
  @ApiOperation({ summary: 'Get presigned URL for avatar upload' })
  getAvatarUploadUrl(@Body() body: { fileName: string; contentType: string }, @Req() req: any) {
    return this.storageService.getPresignedUploadUrl(
      `${req.user.userId}-${body.fileName}`,
      body.contentType,
      'avatars',
    );
  }

  // PATCH /users/avatar — confirm avatar path after successful upload
  @Patch('avatar')
  @ApiOperation({ summary: 'Confirm avatar path after upload' })
  updateAvatar(@Body() body: { avatarPath: string }, @Req() req: any) {
    return this.usersService.updateAvatar(req.user.userId, body.avatarPath);
  }

  // POST /users/change-password — verify current + set new
  @Post('change-password')
  @ApiOperation({ summary: 'Change password' })
  changePassword(@Body() dto: ChangePasswordDto, @Req() req: any) {
    return this.usersService.changePassword(req.user.userId, dto.currentPassword, dto.newPassword);
  }

  // GET /users/activity — docs uploaded + validated this month
  @Get('activity')
  @ApiOperation({ summary: 'Get user activity stats for current month' })
  getActivity(@Req() req: any) {
    return this.usersService.getUserActivity(req.user.userId);
  }
}
