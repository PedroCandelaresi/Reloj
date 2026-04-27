import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/authenticated-user.interface';

export function resolveReportCompanyId(
  user: AuthenticatedUser,
  requestedCompanyId?: string,
): string | null {
  if (user.isSuperAdmin) {
    return requestedCompanyId || null;
  }

  if (!user.companyId) {
    throw new ForbiddenException('El usuario no tiene una empresa activa asignada.');
  }

  if (requestedCompanyId && requestedCompanyId !== user.companyId) {
    throw new ForbiddenException('No podés consultar reportes de otra empresa.');
  }

  return user.companyId;
}
