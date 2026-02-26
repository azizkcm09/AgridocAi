import { IsString, IsNotEmpty, IsIn, Matches } from 'class-validator';

// The allowed file types for AgriDoc AI
const ALLOWED_CONTENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
];

export class GenerateUrlDto {
  @IsString()
  @IsNotEmpty()
  // Ensure the file has a safe name (alphanumeric, dashes, underscores, dots)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'File name contains invalid characters',
  })
  fileName: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(ALLOWED_CONTENT_TYPES, {
    message: 'Invalid file type. Only PDF, JPEG, and PNG are allowed.',
  })
  contentType: string;
}