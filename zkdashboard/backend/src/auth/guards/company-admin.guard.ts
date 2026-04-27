import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { CompanyRole } from '../../companies/company-role.enum';
import { AuthenticatedUser } from '../authenticated-user.interface';

@Injectable()
export class CompanyAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    if (user.isSuperAdmin) {
      return true;
    }

    if (!user.companyId) {
      throw new ForbiddenException('El usuario no tiene empresa activa asignada');
    }

    if (user.companyRole !== CompanyRole.COMPANY_ADMIN) {
      throw new ForbiddenException(
        'Se requieren permisos de administrador de empresa',
      );
    }

    return true;
  }
}
