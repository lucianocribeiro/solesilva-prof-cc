'use server';

import { revalidateTag } from 'next/cache';

import { ETIQUETA_CACHE } from '@/lib/airtable';

/**
 * Fuerza la relectura de Airtable en la próxima navegación, sin esperar a que
 * venza el revalidado por tiempo.
 */
export async function recargarDatos(): Promise<void> {
  revalidateTag(ETIQUETA_CACHE);
}
