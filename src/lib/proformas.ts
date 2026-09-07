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
 * Un documento por cada moneda presente entre los renglones tildados.
 * Los documentos se numeran P-00001, P-00002… según su orden.
 */
export function armarDocumentos(tildados: RenglonVenta[]): DocumentoProforma[] {
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
    .map(([moneda, renglones], indice) => ({
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
      numeroSugerido: `P-${String(indice + 1).padStart(5, '0')}`,
    }));
}
