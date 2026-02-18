import { 
  Body, 
  Controller, 
  Post, 
  HttpCode, 
  HttpStatus, 
  UseGuards, 
  Get, 
  Request 
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth 
} from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // --- LOGIN ---
  @Post('login')
  @ApiOperation({ summary: 'Login User', description: 'Exchange email/password for a JWT Token.' })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful.',
    schema: {
      example: { access_token: 'eyJhbGciOiJIUzI1NiIsIn...' }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new Error('Invalid credentials');
    }
    return this.authService.login(user);
  }

  // --- REGISTER ---
  @Post('register')
  @ApiOperation({ summary: 'Register User', description: 'Create a new user account.' })
  @ApiResponse({ status: 201, description: 'User successfully created.' })
  async register(@Body() loginDto: LoginDto) {
    return this.authService.register(
      loginDto.email,
      loginDto.password,
    );
  }

  // --- PROFILE (PROTECTED) ---
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth() // 👈 Adds the "Lock" icon in Swagger
  @Get('profile')
  @ApiOperation({ 
    summary: 'Get Current Profile', 
    description: 'Returns the authenticated user details. Requires a valid JWT token.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User profile retrieved successfully.', 
    schema: { 
      example: { userId: 'd4a98032-548b...', email: 'aziz@agridoc.ai' } 
    } 
  })
  @ApiResponse({ status: 401, description: 'Unauthorized (Token missing or expired).' })
  getProfile(@Request() req) {
    return req.user;
  }
}