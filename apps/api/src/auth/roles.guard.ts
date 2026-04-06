import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from './roles.enum';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Read the roles required by this route (set via @Roles decorator)
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(), // method-level decorator first
      context.getClass(),   // then class-level decorator
    ]);

    // 2. If no @Roles decorator on this route, allow anyone through
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 3. Read the user from the request (populated by JwtAuthGuard before this runs)
    const { user } = context.switchToHttp().getRequest();

    // 4. Check if the user's role is in the required roles list
    if (!requiredRoles.includes(user?.role)) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }

    return true;
  }
}
