/**
 * Armado de la cuenta corriente: funciones puras, sin nada de React.
 *
 * Cada cliente tiene una sola cuenta corriente y está expresada en dólares.
 * El negocio vende en dólares y cobra en la moneda que el cliente pueda pagar,
 * así que separar por moneda mostraba deuda en una sección y saldo a favor en
 * otra cuando en realidad la venta ya estaba pagada.
 *
 * Reglas que no se negocian:
 * - La app no convierte nada y no aplica ninguna cotización. El equivalente en
 *   dólares ya viene calculado en Airtable, con el tipo de cambio cargado en
 *   cada operación, y acá solo se lee y se suma.
 * - El importe original y su moneda se conservan enteros: quien concilia tiene
 *   que ver que la clienta pagó 1.000.000 en pesos, no solo su equivalente.
 * - Un movimiento sin equivalente en dólares se muestra igual, marcado, y
 *   queda fuera del saldo. Nunca se descarta ni se le asume un valor.
 * - Un equivalente de cero no es una ausencia: es un cero real y entra al
 *   saldo. Lo que distingue un caso del otro es que el dato esté o no esté,
 *   nunca su valor.
 */

import type { DetalleVenta, Movimiento, SaldoInicial } from '@/lib/datos';
import { compararFechas } from '@/lib/fecha';
import { normalizarMoneda, redondear } from '@/lib/moneda';

export type TipoMovimiento = 'venta' | 'cobranza';

export type MovimientoCliente = {
  id: string;
  fecha: string | null;
  tipo: TipoMovimiento;
  /** Identificador del registro en Airtable. */
  comprobante: string | null;
  /** Monto tal como viene en la base. `null` si no está cargado. */
  monto: number | null;
  /** Moneda del monto original. `null` cuando el registro no la tiene cargada. */
  moneda: string | null;
  /**
   * Lo que el movimiento aporta en su moneda original: + en ventas, − en
   * cobranzas. `null` cuando no hay monto: una ausencia no aporta nada, y
   * tampoco es cero.
   */
  aporte: number | null;
  /**
   * Lo que el movimiento aporta al saldo, en dólares, con el mismo signo.
   * `null` cuando la base no trae equivalente: ese movimiento no se suma.
   */
  aporteUSD: number | null;
  /** Artículo, precio unitario y metros. Solo lo traen las ventas. */
  detalle?: DetalleVenta;
  /** La cobranza está vinculada a más de un cliente en la base. */
  compartidoConOtrosClientes?: boolean;
};

/** Todo en dólares: es la única moneda en la que existe el saldo. */
export type Subtotal = {
  saldoInicial: number;
  ventas: number;
  cobranzas: number;
  /** saldo inicial + ventas − cobranzas. */
  total: number;
};

export type BloqueCliente = {
  /**
   * Razón social. `null` es el bloque de movimientos sin cliente asignado:
   * registros que existen en la base y que no cuelgan de ningún cliente.
   */
  cliente: string | null;
  /**
   * Saldo inicial en dólares. `null` cuando no hay ninguno cargado: un saldo
   * inicial de cero está cargado y se muestra igual.
   */
  saldoInicial: number | null;
  /** Ordenados por fecha ascendente, con los que no tienen fecha al final. */
  movimientos: MovimientoCliente[];
  subtotal: Subtotal;
  /**
   * Cuántos movimientos del bloque no tienen equivalente en dólares. Se
   * muestran, pero no están en el subtotal, y el bloque lo avisa: si no,
   * alguien concilia contra un número incompleto sin saberlo.
   */
  sinConversion: number;
};

function armarBloque(
  cliente: string | null,
  saldos: SaldoInicial[],
  ventas: Movimiento[],
  cobranzas: Movimiento[],
): BloqueCliente {
  // Un saldo inicial cargado en cero se muestra igual, así que la existencia
  // se marca aparte del monto.
  const tieneSaldoInicial = saldos.length > 0;
  const saldoInicial = saldos.reduce((suma, saldo) => suma + saldo.monto, 0);

  let totalVentas = 0;
  let totalCobranzas = 0;
  let sinConversion = 0;

  const movimientos: MovimientoCliente[] = [];

  ventas.forEach((venta, indice) => {
    // Sin equivalente en dólares no hay nada que sumar al saldo. El
    // movimiento se muestra igual, marcado.
    if (venta.montoUSD === null) sinConversion += 1;
    else totalVentas += venta.montoUSD;

    movimientos.push({
      id: `venta-${indice}`,
      fecha: venta.fecha,
      tipo: 'venta',
      comprobante: venta.comprobante,
      monto: venta.monto,
      moneda: normalizarMoneda(venta.moneda),
      aporte: venta.monto,
      aporteUSD: venta.montoUSD,
      ...(venta.detalle ? { detalle: venta.detalle } : {}),
    });
  });

  cobranzas.forEach((cobranza, indice) => {
    if (cobranza.montoUSD === null) sinConversion += 1;
    else totalCobranzas += cobranza.montoUSD;

    movimientos.push({
      id: `cobranza-${indice}`,
      fecha: cobranza.fecha,
      tipo: 'cobranza',
      comprobante: cobranza.comprobante,
      monto: cobranza.monto,
      moneda: normalizarMoneda(cobranza.moneda),
      aporte: cobranza.monto === null ? null : -cobranza.monto,
      aporteUSD: cobranza.montoUSD === null ? null : -cobranza.montoUSD,
      ...(cobranza.compartidoConOtrosClientes
        ? { compartidoConOtrosClientes: true }
        : {}),
    });
  });

  return {
    cliente,
    saldoInicial: tieneSaldoInicial ? redondear(saldoInicial) : null,
    movimientos: movimientos.sort((a, b) => compararFechas(a.fecha, b.fecha)),
    subtotal: {
      saldoInicial: redondear(saldoInicial),
      ventas: redondear(totalVentas),
      cobranzas: redondear(totalCobranzas),
      total: redondear(saldoInicial + totalVentas - totalCobranzas),
    },
    sinConversion,
  };
}

/** Hay algo que mostrar solo si el cliente tiene saldo inicial o movimientos. */
export function tieneActividad(bloque: BloqueCliente): boolean {
  return bloque.saldoInicial !== null || bloque.movimientos.length > 0;
}

/**
 * Un bloque por cliente, ordenados alfabéticamente.
 *
 * `padron` es la lista completa de clientes de la base: aparecen todos, tengan
 * o no movimientos. Se le suma cualquier cliente que aparezca en un saldo
 * inicial o en un movimiento y no esté en el padrón.
 *
 * Si hay movimientos sin cliente vinculado, se arma además un bloque con
 * `cliente: null` que va siempre al final.
 */
export function armarCuentaCorriente(
  padron: string[],
  saldosIniciales: SaldoInicial[],
  ventas: Movimiento[],
  cobranzas: Movimiento[],
): BloqueCliente[] {
  const clientes = new Set<string | null>([
    ...padron,
    ...saldosIniciales.map((saldo) => saldo.cliente),
    ...ventas.map((venta) => venta.cliente),
    ...cobranzas.map((cobranza) => cobranza.cliente),
  ]);

  return [...clientes]
    .sort((a, b) => {
      // El bloque sin cliente asignado va último.
      if (a === b) return 0;
      if (a === null) return 1;
      if (b === null) return -1;
      return a.localeCompare(b, 'es');
    })
    .map((cliente) =>
      armarBloque(
        cliente,
        saldosIniciales.filter((saldo) => saldo.cliente === cliente),
        ventas.filter((venta) => venta.cliente === cliente),
        cobranzas.filter((cobranza) => cobranza.cliente === cliente),
      ),
    );
}
