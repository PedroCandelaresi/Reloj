'use server';

import { revalidatePath } from 'next/cache';
import {
  createDepartment,
  createPosition,
  deactivateDepartment,
  deactivatePosition,
  updateDepartment,
  updatePosition,
} from '@/lib/api';

export interface OrgStructureActionResult {
  ok?: true;
  error?: string;
}

type CatalogKind = 'department' | 'position';

function cleanText(value: string | null | undefined) {
  return value?.trim() ?? '';
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function revalidateOrgStructureViews() {
  revalidatePath('/settings/org-structure');
  revalidatePath('/settings');
  revalidatePath('/employees');
  revalidatePath('/reports');
}

export async function saveOrgStructureItemAction(input: {
  kind: CatalogKind;
  id?: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
  companyId?: string | null;
}): Promise<OrgStructureActionResult> {
  const name = cleanText(input.name);
  const description = cleanText(input.description);

  if (!name) {
    return { error: input.kind === 'department' ? 'Completá el nombre del sector.' : 'Completá el nombre del puesto.' };
  }

  try {
    const payload = {
      name,
      description: description || null,
      isActive: input.isActive ?? true,
      companyId: input.companyId || undefined,
    };

    if (input.kind === 'department') {
      if (input.id) {
        await updateDepartment(input.id, payload);
      } else {
        await createDepartment(payload);
      }
    } else if (input.id) {
      await updatePosition(input.id, payload);
    } else {
      await createPosition(payload);
    }

    revalidateOrgStructureViews();
    return { ok: true };
  } catch (error) {
    return {
      error: getErrorMessage(
        error,
        input.kind === 'department' ? 'No se pudo guardar el sector.' : 'No se pudo guardar el puesto.',
      ),
    };
  }
}

export async function toggleOrgStructureItemAction(input: {
  kind: CatalogKind;
  id: string;
  isActive: boolean;
  name: string;
  description?: string | null;
}): Promise<OrgStructureActionResult> {
  const id = cleanText(input.id);
  if (!id) return { error: 'Elemento inválido.' };

  try {
    if (input.isActive) {
      if (input.kind === 'department') {
        await updateDepartment(id, {
          name: input.name,
          description: input.description ?? null,
          isActive: true,
        });
      } else {
        await updatePosition(id, {
          name: input.name,
          description: input.description ?? null,
          isActive: true,
        });
      }
    } else if (input.kind === 'department') {
      await deactivateDepartment(id);
    } else {
      await deactivatePosition(id);
    }

    revalidateOrgStructureViews();
    return { ok: true };
  } catch (error) {
    return {
      error: getErrorMessage(
        error,
        input.isActive ? 'No se pudo reactivar el elemento.' : 'No se pudo desactivar el elemento.',
      ),
    };
  }
}
