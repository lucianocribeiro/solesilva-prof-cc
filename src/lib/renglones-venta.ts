/**
 * Renglones de venta leídos de Airtable: una fila por artículo vendido.
 * Una proforma consolida varias de estas filas en un solo documento.
 *
 * Igual que en cuenta corriente, un campo vacío llega como `null` y el renglón
 * se muestra tal cual está cargado.
 */

import { leerTabla, numero, TABLAS, texto, vinculos } from '@/lib/airtable';
import { indiceDeArticulos } from '@/lib/datos';

export type RenglonVenta = {
  id: string;
  /** Fecha ISO (AAAA-MM-DD). `null` cuando el campo está vacío. */
  fecha: string | null;
  /** Razón social del cliente. */
  cliente: string;
  /** Código del artículo. `null` cuando el renglón no tiene artículo vinculado. */
  codigo: string | null;
  metros: number | null;
  precioUnitario: number | null;
  moneda: string | null;
  /** Metros por precio unitario, tal como lo calcula Airtable. */
  total: number | null;
  observaciones?: string;
};

export async function cargarRenglonesVenta(): Promise<RenglonVenta[]> {
  const [clientes, articulos, registros] = await Promise.all([
    leerTabla(TABLAS.clientes),
    indiceDeArticulos(),
    leerTabla(TABLAS.ventas),
  ]);

  const nombreDeCliente = new Map<string, string>();
  for (const cliente of clientes) {
    const razonSocial = texto(cliente, 'Razón Social');
    if (razonSocial !== null) nombreDeCliente.set(cliente.id, razonSocial);
  }

  const renglones: RenglonVenta[] = [];
  for (const venta of registros) {
    const [idCliente] = vinculos(venta, 'Cliente');
    const cliente = idCliente ? nombreDeCliente.get(idCliente) : undefined;
    if (cliente === undefined) continue;

    // El artículo es un vínculo: la API devuelve el id y el código sale de
    // resolverlo contra la tabla de artículos. Sin vínculo, queda sin código.
    const [idArticulo] = vinculos(venta, 'Artículo');
    const codigo = idArticulo ? (articulos.get(idArticulo) ?? null) : null;

    const observaciones = texto(venta, 'Observaciones');

    renglones.push({
      id: venta.id,
      fecha: texto(venta, 'Fecha'),
      cliente,
      codigo,
      metros: numero(venta, 'Metros'),
      precioUnitario: numero(venta, 'Precio unitario (fijado)'),
      // Campo calculado en Airtable: se toma tal cual viene.
      moneda: texto(venta, 'Moneda Venta'),
      total: numero(venta, 'Total Venta'),
      ...(observaciones !== null ? { observaciones } : {}),
    });
  }

  return renglones;
}
