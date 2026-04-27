import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from './authenticated-user.interface';

export function getCompanyScope(user: AuthenticatedUser): string | null {
  if (user.isSuperAdmin) {
    return null;
  }

  if (!user.companyId) {
    throw new ForbiddenException(
      'El usuario no tiene una empresa activa asignada.',
    );
  }

  return user.companyId;
}
