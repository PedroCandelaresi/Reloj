'use server';

import { revalidatePath } from 'next/cache';
import {
  createAdminCompany,
  deleteAdminCompany,
  updateAdminCompany,
  assignAdminCompanyEmployee,
  removeAdminCompanyEmployee,
  createAdminCompanyUser,
  updateAdminCompanyUser,
  removeAdminCompanyUser,
} from '@/lib/api';
import type { CompanyInput, CompanyUpdateInput, CompanyUserInput, CompanyUserUpdateInput } from '@/lib/api';

export interface CompanyActionResult {
  ok?: true;
  error?: string;
}

function cleanText(value: string | null | undefined) {
  return value?.trim() ?? '';
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function revalidateAdminViews() {
  revalidatePath('/admin/companies');
  revalidatePath('/admin/devices');
  revalidatePath('/dashboard');
}

export async function createCompanyAction(input: CompanyInput): Promise<CompanyActionResult> {
  const cuit = cleanText(input.cuit);
  const razonSocial = cleanText(input.razonSocial);
  const nombreFantasia = cleanText(input.nombreFantasia);

  if (!cuit || !razonSocial) {
    return { error: 'Completá CUIT y razón social.' };
  }

  try {
    await createAdminCompany({
      cuit,
      razonSocial,
      nombreFantasia: nombreFantasia || null,
      isActive: input.isActive ?? true,
    });
    revalidateAdminViews();
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo crear la empresa.') };
  }
}

export async function updateCompanyAction(
  id: string,
  input: CompanyUpdateInput,
): Promise<CompanyActionResult> {
  const cleanId = cleanText(id);
  const cuit = input.cuit === undefined ? undefined : cleanText(input.cuit);
  const razonSocial =
    input.razonSocial === undefined ? undefined : cleanText(input.razonSocial);
  const nombreFantasia =
    input.nombreFantasia === undefined ? undefined : cleanText(input.nombreFantasia);

  if (!cleanId) {
    return { error: 'Empresa inválida.' };
  }

  if (cuit !== undefined && !cuit) {
    return { error: 'El CUIT no puede quedar vacío.' };
  }

  if (razonSocial !== undefined && !razonSocial) {
    return { error: 'La razón social no puede quedar vacía.' };
  }

  try {
    await updateAdminCompany(cleanId, {
      ...(cuit !== undefined ? { cuit } : {}),
      ...(razonSocial !== undefined ? { razonSocial } : {}),
      ...(nombreFantasia !== undefined ? { nombreFantasia: nombreFantasia || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });
    revalidateAdminViews();
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo actualizar la empresa.') };
  }
}

export async function deleteCompanyAction(id: string): Promise<CompanyActionResult> {
  const cleanId = cleanText(id);
  if (!cleanId) {
    return { error: 'Empresa inválida.' };
  }

  try {
    await deleteAdminCompany(cleanId);
    revalidateAdminViews();
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo eliminar la empresa.') };
  }
}

export async function assignCompanyEmployeeAction(
  companyId: string,
  employeeId: string,
): Promise<CompanyActionResult> {
  try {
    await assignAdminCompanyEmployee(companyId, employeeId);
    revalidateAdminViews();
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo asignar el empleado.') };
  }
}

export async function removeCompanyEmployeeAction(
  companyId: string,
  employeeId: string,
): Promise<CompanyActionResult> {
  try {
    await removeAdminCompanyEmployee(companyId, employeeId);
    revalidateAdminViews();
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo quitar el empleado.') };
  }
}

export async function createCompanyUserAction(
  companyId: string,
  input: CompanyUserInput,
): Promise<CompanyActionResult> {
  try {
    await createAdminCompanyUser(companyId, input);
    revalidateAdminViews();
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo crear el usuario.') };
  }
}

export async function updateCompanyUserAction(
  companyId: string,
  userId: number,
  input: CompanyUserUpdateInput,
): Promise<CompanyActionResult> {
  try {
    await updateAdminCompanyUser(companyId, userId, input);
    revalidateAdminViews();
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo actualizar el usuario.') };
  }
}

export async function removeCompanyUserAction(
  companyId: string,
  userId: number,
): Promise<CompanyActionResult> {
  try {
    await removeAdminCompanyUser(companyId, userId);
    revalidateAdminViews();
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, 'No se pudo eliminar el usuario.') };
  }
}
