import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // 1. Validate User (Check if password is correct)
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      if (!user.isActive) {
        throw new UnauthorizedException('Account deactivated');
      }
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  // 2. Login (Generate JWT)
  // Include name and role in the payload so the frontend can use them
  // without an extra API call (decoded from the token client-side)
  async login(user: any) {
    const payload = { email: user.email, sub: user.id, name: user.name ?? null, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

// 3. Register (Hash password & Create User)
  async register(email: string, pass: string) {
    const hashedPassword = await bcrypt.hash(pass, 10);
    
    // Create the user
    const user = await this.usersService.create({
      email,
      password: hashedPassword,
    });

  
    // Remove password from response
    const { password, ...result } = user;
    return result;
  }
}