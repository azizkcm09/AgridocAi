import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'aziz@agridoc.ai',
    description: 'The email address of the user'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'securePassword123',
    description: 'The password (min 6 characters)'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}