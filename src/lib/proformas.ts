/**
 * Armado de proformas: funciones puras, sin nada de React.
 *
 * Regla que no se negocia: una proforma, una sola moneda. Si entre los
 * renglones tildados hay más de una moneda se arma un documento por cada una.
 * Nunca se suman ni se convierten monedas distintas, y no hay ninguna lista de
 * monedas: se agrupa por los valores que efectivamente traen los renglones.
 */

import { compararFechas } from '@/lib/fecha';
import { claveMoneda, compararMonedas, normalizarMoneda, redondear } from '@/lib/moneda';
import type { RenglonVenta } from '@/lib/renglones-venta';

/**
 * Filtro de fecha de la pantalla. La fecha es opcional:
 * - `'todas'` no filtra y muestra todos los renglones del cliente
 * - una fecha ISO filtra por esa fecha
 * - `null` muestra los renglones con el campo de fecha vacío
 */
export type FiltroFecha = 'todas' | string | null;

export const TODAS_LAS_FECHAS = 'todas';

/**
 * Lo que el usuario escribe sobre el documento. No sale de Airtable ni vuelve a
 * la base: vive en la pantalla y viaja al papel y al PDF tal como se escribió.
 */
export type CamposDocumento = {
  numero: string;
  observaciones: string;
  condiciones: string;
};

/** Texto con el que arranca el bloque de condiciones. El usuario puede cambiarlo. */
export const CONDICIONES_POR_DEFECTO =
  'Validez de la proforma: 15 días corridos desde la fecha de emisión.\n' +
  'Los precios están sujetos a confirmación de stock al momento del pedido.\n' +
  'Forma de pago y plazo de entrega a convenir con la orden de compra.';

export type DocumentoProforma = {
  moneda: string | null;
  /** Clave estable para el estado de la pantalla y para las keys de React. */
  clave: string;
  renglones: RenglonVenta[];
  totalMetros: number;
  cantidadRenglones: number;
  total: number;
  /** Valor inicial del número, editable en pantalla. */
  numeroSugerido: string;
};

/** Clientes con renglones cargados, en orden alfabético. */
export function clientesConVentas(renglones: RenglonVenta[]): string[] {
  const clientes = new Set(renglones.map((renglon) => renglon.cliente));
  return [...clientes].sort((a, b) => a.localeCompare(b, 'es'));
}

/**
 * Fechas que el cliente tiene efectivamente cargadas, de la más reciente a la
 * más vieja. Si hay renglones sin fecha, `null` aparece como una opción más.
 */
export function fechasDeCliente(
  renglones: RenglonVenta[],
  cliente: string,
): (string | null)[] {
  const fechas = new Set(
    renglones
      .filter((renglon) => renglon.cliente === cliente)
      .map((renglon) => renglon.fecha),
  );

  // De la más reciente a la más vieja, y "sin fecha" siempre al final.
  return [...fechas].sort((a, b) => {
    if (a === b) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return a < b ? 1 : -1;
  });
}

/**
 * Renglones de un cliente, ordenados por fecha ascendente y con los que no
 * tienen fecha al final. El filtro de fecha es opcional.
 */
export function renglonesDe(
  renglones: RenglonVenta[],
  cliente: string,
  filtro: FiltroFecha,
): RenglonVenta[] {
  return renglones
    .filter((renglon) => renglon.cliente === cliente)
    .filter((renglon) => filtro === TODAS_LAS_FECHAS || renglon.fecha === filtro)
    .sort((a, b) => compararFechas(a.fecha, b.fecha));
}

/**
 * Palabras que no aportan nada a una sigla: conectores y formas jurídicas.
 * Sin ellas, "Textiles del Sur S.R.L." queda en TS y no en TDSSRL.
 */
const PALABRAS_SIN_INICIAL = new Set([
  'DE', 'DEL', 'LA', 'LAS', 'LOS', 'EL', 'Y', 'E',
  'SA', 'SAS', 'SRL', 'SC', 'SCA', 'SAIC', 'LTDA', 'LTD', 'INC', 'CIA',
]);

/** Más de cuatro iniciales ya no es una sigla, es un trabalenguas. */
const MAXIMO_INICIALES = 4;

/** Letras que aporta un nombre de una sola palabra, donde no hay sigla posible. */
const LETRAS_DE_PALABRA_UNICA = 3;

/** Mayúsculas sin acentos y sin nada que no sea letra o número. */
function soloAlfanumerico(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Iniciales de la razón social del cliente. "Hilandería del Norte S.A." da HN.
 *
 * Las siglas escritas con puntos se juntan antes de separar en palabras, para
 * que "S.R.L." cuente como una sola palabra —descartable— y no como tres
 * iniciales sueltas. Si después de descartar no queda ninguna palabra, se usan
 * las del nombre tal cual vino: un número raro es mejor que uno vacío.
 *
 * Un nombre de una sola palabra no da una sigla sino una letra, que no
 * identifica nada, así que en ese caso se usan sus primeras tres: "Acme" da ACM.
 */
function inicialesDeCliente(cliente: string): string {
  const normalizado = cliente
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\b([A-Z])\.\s*(?=[A-Z]\.)/g, '$1');

  const palabras = normalizado.split(/[^A-Z0-9]+/).filter(Boolean);
  const significativas = palabras.filter(
    (palabra) => !PALABRAS_SIN_INICIAL.has(palabra),
  );
  const base = significativas.length > 0 ? significativas : palabras;
  if (base.length === 1) return base[0].slice(0, LETRAS_DE_PALABRA_UNICA);

  return base
    .slice(0, MAXIMO_INICIALES)
    .map((palabra) => palabra[0])
    .join('');
}

/**
 * Número sugerido: iniciales del cliente y fecha de emisión, sin separadores,
 * solo letras y números. "Hilandería del Norte S.A." el 13/09/2026 da
 * HN20260913.
 *
 * Cuando el corte por moneda parte la selección en varios documentos, todos
 * comparten cliente y fecha, así que la moneda va al final para distinguirlos:
 * HN20260913USD. Con un solo documento no hace falta y no se agrega. Si la
 * moneda no deja ninguna letra ni número utilizable, desempata el orden.
 */
function numeroSugeridoDe(
  cliente: string,
  fecha: string,
  moneda: string | null,
  indice: number,
  cantidadDeDocumentos: number,
): string {
  const encabezado = inicialesDeCliente(cliente) + soloAlfanumerico(fecha);
  if (cantidadDeDocumentos < 2) return encabezado;

  const sufijo = soloAlfanumerico(moneda ?? '');
  return encabezado + (sufijo === '' ? String(indice + 1) : sufijo);
}

/**
 * Un documento por cada moneda presente entre los renglones tildados.
 *
 * El cliente y la fecha de emisión no cambian nada del contenido: entran solo
 * para armar el número sugerido de cada documento.
 */
export function armarDocumentos(
  tildados: RenglonVenta[],
  cliente: string,
  fecha: string,
): DocumentoProforma[] {
  const porMoneda = new Map<string | null, RenglonVenta[]>();

  for (const renglon of tildados) {
    const moneda = normalizarMoneda(renglon.moneda);
    const grupo = porMoneda.get(moneda);
    if (grupo) {
      grupo.push(renglon);
    } else {
      porMoneda.set(moneda, [renglon]);
    }
  }

  return [...porMoneda.entries()]
    .sort(([a], [b]) => compararMonedas(a, b))
    .map(([moneda, renglones], indice, documentos) => ({
      moneda,
      clave: claveMoneda(moneda),
      renglones,
      // Un renglón sin metros o sin total no aporta nada a la suma: no hay
      // nada que sumar. Igual se cuenta como renglón y se muestra en el detalle.
      totalMetros: redondear(
        renglones.reduce((suma, renglon) => suma + (renglon.metros ?? 0), 0),
      ),
      cantidadRenglones: renglones.length,
      total: redondear(
        renglones.reduce((suma, renglon) => suma + (renglon.total ?? 0), 0),
      ),
      numeroSugerido: numeroSugeridoDe(
        cliente,
        fecha,
        moneda,
        indice,
        documentos.length,
      ),
    }));
}
