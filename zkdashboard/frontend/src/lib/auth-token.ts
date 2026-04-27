export type CompanyRole = 'company_admin' | 'operator' | 'read_only';

export interface FrontendJwtMembership {
  companyId: string;
  role: CompanyRole;
}

export interface FrontendJwtPayload {
  sub: number;
  username: string;
  isSuperAdmin?: boolean;
  employeeId?: string | null;
  companyId?: string | null;
  companyRole?: CompanyRole | null;
  memberships?: FrontendJwtMembership[];
  iat?: number;
  exp?: number;
}

function decodeBase64Url(input: string): string | null {
  try {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4;
    const padded = normalized + (padding ? '='.repeat(4 - padding) : '');

    if (typeof atob !== 'function') {
      return null;
    }

    return atob(padded);
  } catch {
    return null;
  }
}

export function decodeJwtPayload(token?: string | null): FrontendJwtPayload | null {
  if (!token) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  const decoded = decodeBase64Url(parts[1]);
  if (!decoded) {
    return null;
  }

  try {
    return JSON.parse(decoded) as FrontendJwtPayload;
  } catch {
    return null;
  }
}

export function getDefaultAppPath(payload?: Pick<FrontendJwtPayload, 'isSuperAdmin'> | null) {
  return payload?.isSuperAdmin ? '/admin/companies' : '/dashboard';
}
