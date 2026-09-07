/**
 * Armado de la cuenta corriente: funciones puras, sin nada de React.
 *
 * Reglas que no se negocian:
 * - No se valida, no se corrige, no se completa y no se convierte nada.
 * - Nunca se suman montos de monedas distintas.
 * - No hay ninguna lista de monedas: la moneda es el valor que trae el campo y
 *   se agrupa por los valores que efectivamente aparecen en los datos.
 * - La ausencia de moneda es un grupo más, representado por `null`.
 */

import type { Movimiento, SaldoInicial } from '@/lib/datos';
import { compararFechas } from '@/lib/fecha';
import { compararMonedas, normalizarMoneda, redondear } from '@/lib/moneda';

export type TipoMovimiento = 'venta' | 'cobranza';

export type MovimientoCliente = {
  id: string;
  fecha: string | null;
  tipo: TipoMovimiento;
  /** Identificador del registro en Airtable. */
  comprobante: string | null;
  /** Monto tal como viene en la base. `null` si no está cargado. */
  monto: number | null;
  /**
   * Lo que el movimiento aporta al saldo: + en ventas, − en cobranzas.
   * `null` cuando no hay monto: una ausencia no aporta nada, y tampoco es cero.
   */
  aporte: number | null;
  moneda: string | null;
  /** La cobranza está vinculada a más de un cliente en la base. */
  compartidoConOtrosClientes?: boolean;
};

export type LineaSaldoInicial = {
  moneda: string | null;
  monto: number;
};

export type Subtotal = {
  moneda: string | null;
  saldoInicial: number;
  ventas: number;
  cobranzas: number;
  /** saldo inicial + ventas − cobranzas, siempre dentro de la misma moneda. */
  total: number;
};

export type BloqueCliente = {
  /**
   * Razón social. `null` es el bloque de movimientos sin cliente asignado:
   * registros que existen en la base y que no cuelgan de ningún cliente.
   */
  cliente: string | null;
  saldosIniciales: LineaSaldoInicial[];
  movimientos: MovimientoCliente[];
  subtotales: Subtotal[];
};

/** Acumulador por moneda mientras se recorre un cliente. */
type Acumulado = Subtotal & { tieneSaldoInicial: boolean };

function armarBloque(
  cliente: string | null,
  saldos: SaldoInicial[],
  ventas: Movimiento[],
  cobranzas: Movimiento[],
): BloqueCliente {
  const porMoneda = new Map<string | null, Acumulado>();

  function acumulado(moneda: string | null): Acumulado {
    const clave = normalizarMoneda(moneda);
    const existente = porMoneda.get(clave);
    if (existente) return existente;

    const nuevo: Acumulado = {
      moneda: clave,
      saldoInicial: 0,
      ventas: 0,
      cobranzas: 0,
      total: 0,
      tieneSaldoInicial: false,
    };
    porMoneda.set(clave, nuevo);
    return nuevo;
  }

  for (const saldo of saldos) {
    const fila = acumulado(saldo.moneda);
    fila.saldoInicial += saldo.monto;
    // Se marca aparte del monto: un saldo inicial cargado en cero igual se muestra.
    fila.tieneSaldoInicial = true;
  }

  const movimientos: MovimientoCliente[] = [];

  ventas.forEach((venta, indice) => {
    // Sin monto cargado no hay nada que sumar. El movimiento se muestra igual.
    const fila = acumulado(venta.moneda);
    if (venta.monto !== null) fila.ventas += venta.monto;

    movimientos.push({
      id: `venta-${indice}`,
      fecha: venta.fecha,
      tipo: 'venta',
      comprobante: venta.comprobante,
      monto: venta.monto,
      aporte: venta.monto,
      moneda: normalizarMoneda(venta.moneda),
    });
  });

  cobranzas.forEach((cobranza, indice) => {
    const fila = acumulado(cobranza.moneda);
    if (cobranza.monto !== null) fila.cobranzas += cobranza.monto;

    movimientos.push({
      id: `cobranza-${indice}`,
      fecha: cobranza.fecha,
      tipo: 'cobranza',
      comprobante: cobranza.comprobante,
      monto: cobranza.monto,
      aporte: cobranza.monto === null ? null : -cobranza.monto,
      moneda: normalizarMoneda(cobranza.moneda),
      ...(cobranza.compartidoConOtrosClientes
        ? { compartidoConOtrosClientes: true }
        : {}),
    });
  });

  movimientos.sort((a, b) => compararFechas(a.fecha, b.fecha));

  const acumulados = [...porMoneda.values()].sort((a, b) =>
    compararMonedas(a.moneda, b.moneda),
  );

  return {
    cliente,
    saldosIniciales: acumulados
      .filter((fila) => fila.tieneSaldoInicial)
      .map((fila) => ({ moneda: fila.moneda, monto: redondear(fila.saldoInicial) })),
    movimientos,
    subtotales: acumulados.map((fila) => ({
      moneda: fila.moneda,
      saldoInicial: redondear(fila.saldoInicial),
      ventas: redondear(fila.ventas),
      cobranzas: redondear(fila.cobranzas),
      total: redondear(fila.saldoInicial + fila.ventas - fila.cobranzas),
    })),
  };
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
