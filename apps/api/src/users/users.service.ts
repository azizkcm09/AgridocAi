import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Find a user by email (used by auth)
  async findOne(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  // Create a new user (used by auth register)
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  // Get user profile by ID — returns only safe fields (no password)
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarPath: true,
        createdAt: true,
      },
    });
    return user;
  }

  // Update profile fields (name)
  async updateProfile(id: string, data: { name?: string }) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        avatarPath: true,
        createdAt: true,
      },
    });
  }

  // Update avatar path after the user uploads to MinIO
  async updateAvatar(id: string, avatarPath: string) {
    return this.prisma.user.update({
      where: { id },
      data: { avatarPath },
      select: {
        id: true,
        email: true,
        name: true,
        avatarPath: true,
        createdAt: true,
      },
    });
  }

  // Change password — verify current password first, then hash and save new one
  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new BadRequestException('User not found');

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new BadRequestException('Current password is incorrect');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  // Get user activity stats for the current month
  async getUserActivity(userId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [uploaded, validated] = await Promise.all([
      this.prisma.document.count({
        where: {
          userId,
          deletedAt: null,
          createdAt: { gte: monthStart },
        },
      }),
      this.prisma.document.count({
        where: {
          userId,
          deletedAt: null,
          status: 'VALIDATED',
          updatedAt: { gte: monthStart },
        },
      }),
    ]);

    return { uploaded, validated };
  }
}
