import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: { isSuperAdmin?: boolean } }>();

    if (!request.user?.isSuperAdmin) {
      throw new ForbiddenException('Se requieren permisos de super administrador');
    }

    return true;
  }
}
