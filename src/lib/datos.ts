/**
 * Datos de la cuenta corriente, leídos de Airtable.
 *
 * La app es un espejo de la base: no valida, no corrige, no completa y no
 * convierte. Un campo vacío en Airtable llega acá como `null`, nunca como cero
 * ni como cadena vacía.
 */

import {
  ETIQUETA_CACHE,
  indicePorCampo,
  leerTabla,
  numero,
  TABLAS,
  texto,
  vinculos,
} from '@/lib/airtable';

export { ETIQUETA_CACHE };

/**
 * La tabla Clientes tiene un único campo de saldo inicial, numérico y sin un
 * campo de moneda al lado, así que se lee como dólares porque es lo único que
 * hay para leer. El día que exista un campo de moneda, se cambia acá y en
 * ningún otro lado.
 */
export const MONEDA_SALDO_INICIAL = 'USD';

export type SaldoInicial = {
  cliente: string;
  monto: number;
  moneda: string | null;
};

export type Movimiento = {
  /** Fecha ISO (AAAA-MM-DD). `null` cuando el campo está vacío. */
  fecha: string | null;
  /**
   * Razón social del cliente. `null` cuando el registro no tiene cliente
   * vinculado en la base. Esos movimientos existen y se muestran igual, en un
   * bloque propio al final de la lista.
   */
  cliente: string | null;
  /**
   * Identificador del registro en Airtable: el campo primario de la tabla.
   * En ventas es "Venta" (VD-00020) y en cobranzas "Comprobante" (R-00011).
   */
  comprobante: string | null;
  /** `null` cuando el monto no está cargado. No se asume cero. */
  monto: number | null;
  moneda: string | null;
  /**
   * La cobranza está vinculada a más de un cliente en la base. Se muestra
   * entera bajo cada uno, porque repartir el monto sería inventar una división
   * que la base no tiene. La marca avisa que no es un registro duplicado.
   */
  compartidoConOtrosClientes?: boolean;
};

export type DatosCuentaCorriente = {
  /** Todos los clientes de la base, tengan o no movimientos. */
  padron: string[];
  saldosIniciales: SaldoInicial[];
  ventas: Movimiento[];
  cobranzas: Movimiento[];
};

export async function cargarCuentaCorriente(): Promise<DatosCuentaCorriente> {
  const [clientes, registrosVentas, registrosCobranzas] = await Promise.all([
    leerTabla(TABLAS.clientes),
    leerTabla(TABLAS.ventas),
    leerTabla(TABLAS.cobranzas),
  ]);

  const nombreDeCliente = new Map<string, string>();
  for (const cliente of clientes) {
    const razonSocial = texto(cliente, 'Razón Social');
    if (razonSocial !== null) nombreDeCliente.set(cliente.id, razonSocial);
  }

  const padron = [...nombreDeCliente.values()];

  const saldosIniciales: SaldoInicial[] = [];
  for (const cliente of clientes) {
    const razonSocial = texto(cliente, 'Razón Social');
    const monto = numero(cliente, 'Saldo Inicial USD');
    // Sin saldo inicial cargado no hay línea de saldo inicial.
    if (razonSocial === null || monto === null) continue;
    saldosIniciales.push({
      cliente: razonSocial,
      monto,
      moneda: MONEDA_SALDO_INICIAL,
    });
  }

  const ventas: Movimiento[] = [];
  for (const venta of registrosVentas) {
    // El vínculo a cliente en Ventas admite uno solo. Sin vínculo, la venta
    // igual se registra: no se esconde plata que está cargada en la base.
    const [idCliente] = vinculos(venta, 'Cliente');
    const cliente = idCliente ? (nombreDeCliente.get(idCliente) ?? null) : null;

    ventas.push({
      fecha: texto(venta, 'Fecha'),
      cliente,
      comprobante: texto(venta, 'Venta'),
      monto: numero(venta, 'Total Venta'),
      moneda: texto(venta, 'Moneda Venta'),
    });
  }

  const cobranzas: Movimiento[] = [];
  for (const cobranza of registrosCobranzas) {
    // El vínculo a cliente en Cobranzas admite varios: la cobranza se muestra
    // entera bajo cada cliente vinculado, con la marca correspondiente.
    const idsCliente = vinculos(cobranza, 'Cliente');
    const compartida = idsCliente.length > 1;

    // Sin vínculo a cliente, la cobranza va al bloque sin cliente asignado.
    const destinos: (string | null)[] = idsCliente.length
      ? idsCliente.map((id) => nombreDeCliente.get(id) ?? null)
      : [null];

    for (const cliente of destinos) {
      cobranzas.push({
        fecha: texto(cobranza, 'Fecha'),
        cliente,
        comprobante: texto(cobranza, 'Comprobante'),
        // Solo el bruto: nada de gastos, neto ni convertido a dólares.
        monto: numero(cobranza, 'Monto Bruto'),
        moneda: texto(cobranza, 'Moneda'),
        ...(compartida ? { compartidoConOtrosClientes: true } : {}),
      });
    }
  }

  return { padron, saldosIniciales, ventas, cobranzas };
}

/** Se exporta para que la pantalla de proformas reuse el índice de artículos. */
export function indiceDeArticulos(): Promise<Map<string, string>> {
  return indicePorCampo(TABLAS.articulos, 'Artículo');
}
