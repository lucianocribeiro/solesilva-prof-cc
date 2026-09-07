/**
 * Acceso a Airtable. Todo pasa por acá y todo corre en el servidor: el token
 * se lee de la variable de entorno dentro de este módulo y nunca se expone.
 *
 * Esta es la capa que adapta. Si algo de Airtable no encaja con la forma que
 * consumen las pantallas, se resuelve acá y no en el render.
 */

import { airtableBaseId, airtableToken } from '@/lib/env';

const API = 'https://api.airtable.com/v0';

/** Tablas de la base, por id: los nombres pueden cambiar, los ids no. */
export const TABLAS = {
  clientes: 'tbl0svXVeBqBBNdzW',
  ventas: 'tblWMMXQM12DYMepI',
  cobranzas: 'tbl1lTAm3NA5PIG7b',
  articulos: 'tblh2A5mfN7brvRxa',
} as const;

/** Dirección de la base en Airtable, armada con el id configurado. */
export function urlDeLaBase(): string {
  return `https://airtable.com/${airtableBaseId()}`;
}

/** Etiqueta de cache: revalidarla fuerza la recarga de todas las tablas. */
export const ETIQUETA_CACHE = 'airtable';

/** Cada cuánto se refrescan los datos sin intervención. */
const SEGUNDOS_DE_CACHE = 300;

/** Falla de lectura: la pantalla la muestra como error, no como base vacía. */
export class ErrorAirtable extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorAirtable';
  }
}

export type Registro = {
  id: string;
  fields: Record<string, unknown>;
};

type Pagina = {
  records?: Registro[];
  offset?: string;
  error?: { type?: string; message?: string };
};

/**
 * Lee una tabla entera. Airtable devuelve como máximo 100 registros por
 * página, así que se sigue el `offset` hasta agotarlo: la tabla de clientes
 * tiene cientos de registros y con una sola página faltarían.
 */
export async function leerTabla(tabla: string): Promise<Registro[]> {
  const token = airtableToken();
  const base = airtableBaseId();

  const registros: Registro[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`${API}/${base}/${tabla}`);
    url.searchParams.set('pageSize', '100');
    if (offset) url.searchParams.set('offset', offset);

    let respuesta: Response;
    try {
      respuesta = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: SEGUNDOS_DE_CACHE, tags: [ETIQUETA_CACHE] },
      });
    } catch {
      throw new ErrorAirtable(
        'No se pudo conectar con Airtable. Revisá la conexión a internet.',
      );
    }

    const pagina = (await respuesta.json().catch(() => ({}))) as Pagina;

    if (!respuesta.ok) {
      if (respuesta.status === 401 || respuesta.status === 403) {
        throw new ErrorAirtable(
          'Airtable rechazó las credenciales. Revisá AIRTABLE_TOKEN y que ' +
            'tenga permiso de lectura sobre la base.',
        );
      }
      if (respuesta.status === 404) {
        throw new ErrorAirtable(
          `Airtable no encontró la tabla ${tabla} en la base ${base}. ` +
            'Revisá AIRTABLE_BASE_ID.',
        );
      }
      throw new ErrorAirtable(
        `Airtable respondió ${respuesta.status}` +
          (pagina.error?.message ? `: ${pagina.error.message}` : '.'),
      );
    }

    registros.push(...(pagina.records ?? []));
    offset = pagina.offset;
  } while (offset);

  return registros;
}

/* ---------------------------------------------------------------------------
   Lectura de campos.

   Airtable omite del registro los campos vacíos. Un campo que falta es una
   ausencia, no un cero ni una cadena vacía, y así se propaga.
--------------------------------------------------------------------------- */

export function texto(registro: Registro, campo: string): string | null {
  const valor = registro.fields[campo];
  if (typeof valor !== 'string') return null;
  return valor === '' ? null : valor;
}

export function numero(registro: Registro, campo: string): number | null {
  const valor = registro.fields[campo];
  return typeof valor === 'number' ? valor : null;
}

/** Ids de los registros vinculados. Vacío si el vínculo no está cargado. */
export function vinculos(registro: Registro, campo: string): string[] {
  const valor = registro.fields[campo];
  if (!Array.isArray(valor)) return [];
  return valor.filter((id): id is string => typeof id === 'string');
}

/** Índice id de registro -> valor de un campo de texto, para resolver vínculos. */
export async function indicePorCampo(
  tabla: string,
  campo: string,
): Promise<Map<string, string>> {
  const registros = await leerTabla(tabla);
  const indice = new Map<string, string>();
  for (const registro of registros) {
    const valor = texto(registro, campo);
    if (valor !== null) indice.set(registro.id, valor);
  }
  return indice;
}
