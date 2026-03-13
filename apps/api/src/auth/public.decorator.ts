import { SetMetadata } from '@nestjs/common';

// This key is used by the JWT auth guard to check if a route is public
export const IS_PUBLIC_KEY = 'isPublic';

// Usage: put @Public() on any controller method to skip JWT auth
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
