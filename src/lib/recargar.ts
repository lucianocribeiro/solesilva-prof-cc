'use server';

import { revalidateTag } from 'next/cache';

import { ETIQUETA_CACHE } from '@/lib/airtable';

/**
 * Fuerza la relectura de Airtable en la próxima navegación, sin esperar a que
 * venza el revalidado por tiempo.
 *
 * Devuelve el momento en que se hizo. La lectura de las cuatro tablas tarda uno
 * o dos segundos y, si los datos no cambiaron, la pantalla queda igual: sin esa
 * marca el botón parece no hacer nada.
 */
export async function recargarDatos(): Promise<number> {
  revalidateTag(ETIQUETA_CACHE);
  return Date.now();
}
