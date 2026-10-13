/**
 * Renglones de venta leídos de Airtable: una fila por artículo vendido.
 * Una proforma consolida varias de estas filas en un solo documento.
 *
 * Igual que en cuenta corriente, un campo vacío llega como `null` y el renglón
 * se muestra tal cual está cargado.
 */

import { leerTabla, numero, TABLAS, texto, vinculos } from '@/lib/airtable';
import { indiceDeArticulos } from '@/lib/datos';
import { urlDeFoto } from '@/lib/fotos';

/**
 * Unidad en la que se cotiza un renglón. En Ventas la cantidad se carga
 * siempre en metros; Airtable calcula aparte las yardas.
 */
export type Unidad = 'metros' | 'yardas';

/**
 * Listas de precios cuyo precio está expresado por yarda. Sirve solo para
 * elegir qué campo de cantidad se lee: la conversión y el total los calcula
 * Airtable, y acá no se repite ninguna de las dos cosas.
 */
const LISTAS_EN_YARDAS = new Set(['CAT. USA', 'CAT. EUR']);

export type RenglonVenta = {
  id: string;
  /** Fecha ISO (AAAA-MM-DD). `null` cuando el campo está vacío. */
  fecha: string | null;
  /** Razón social del cliente. */
  cliente: string;
  /** Código del artículo. `null` cuando el renglón no tiene artículo vinculado. */
  codigo: string | null;
  /**
   * Descripción de la tela, leída del artículo vinculado. Hoy está sin cargar
   * en toda la base y por eso sale en blanco. No se reemplaza por el código.
   */
  descripcion: string | null;
  /**
   * Dirección de la foto del artículo dentro de la app, o `null` si el
   * artículo no tiene foto cargada. Nunca es una URL de Airtable: esas caducan
   * y no salen del servidor. Dos renglones del mismo artículo traen la misma
   * dirección, y eso es lo que permite bajar y embeber la foto una sola vez.
   */
  foto: string | null;
  /**
   * Unidad del renglón, definida por su lista de precios. El precio unitario
   * ya viene expresado en esta unidad.
   */
  unidad: Unidad;
  /**
   * Cantidad en la unidad del renglón: el campo Metros, o el campo Yardas que
   * calcula Airtable. La app no convierte.
   */
  cantidad: number | null;
  precioUnitario: number | null;
  moneda: string | null;
  /** Cantidad por precio unitario, tal como lo calcula Airtable. */
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

    // El artículo es un vínculo: la API devuelve el id y el código y la
    // descripción salen de resolverlo contra la tabla de artículos. Sin
    // vínculo, el renglón queda sin código y sin descripción.
    const [idArticulo] = vinculos(venta, 'Artículo');
    const articulo = idArticulo ? articulos.get(idArticulo) : undefined;

    const observaciones = texto(venta, 'Observaciones');

    const lista = texto(venta, 'Lista de Precios');
    const unidad: Unidad =
      lista !== null && LISTAS_EN_YARDAS.has(lista) ? 'yardas' : 'metros';

    renglones.push({
      id: venta.id,
      fecha: texto(venta, 'Fecha'),
      cliente,
      codigo: articulo?.codigo ?? null,
      descripcion: articulo?.descripcion ?? null,
      foto: idArticulo && articulo?.tieneFoto ? urlDeFoto(idArticulo) : null,
      unidad,
      cantidad: numero(venta, unidad === 'yardas' ? 'Yardas' : 'Metros'),
      precioUnitario: numero(venta, 'Precio unitario (fijado)'),
      // Campo calculado en Airtable: se toma tal cual viene.
      moneda: texto(venta, 'Moneda Venta'),
      total: numero(venta, 'Total Venta'),
      ...(observaciones !== null ? { observaciones } : {}),
    });
  }

  return renglones;
}
