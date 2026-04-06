import { IsEnum } from 'class-validator';
import { Role } from '../../auth/roles.enum';

export class UpdateRoleDto {
  @IsEnum(Role)
  role: Role;
}
