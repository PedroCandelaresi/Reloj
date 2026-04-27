import { CompanyRole } from '../companies/company-role.enum';

export interface AuthenticatedUserMembership {
  companyId: string;
  role: CompanyRole;
  company: {
    id: string;
    cuit: string;
    razonSocial: string;
    nombreFantasia: string | null;
    isActive: boolean;
  } | null;
}

export interface AuthenticatedUser {
  id: number;
  username: string;
  isSuperAdmin: boolean;
  employeeId: string | null;
  companyId: string | null;
  companyRole: CompanyRole | null;
  memberships: AuthenticatedUserMembership[];
}
