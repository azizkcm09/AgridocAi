import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ 
    example: 'aziz@agridoc.ai', 
    description: 'The email address of the user' 
  })
  email: string;

  @ApiProperty({ 
    example: 'securePassword123', 
    description: 'The password (min 6 characters)' 
  })
  password: string;
}