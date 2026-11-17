/**
 * Datos de la cuenta corriente, leídos de Airtable.
 *
 * La app es un espejo de la base: no valida, no corrige, no completa y no
 * convierte. Un campo vacío en Airtable llega acá como `null`, nunca como cero
 * ni como cadena vacía.
 */

import {
  adjuntos,
  ETIQUETA_CACHE,
  leerTabla,
  numero,
  type Registro,
  TABLAS,
  texto,
  vinculos,
} from '@/lib/airtable';

export { ETIQUETA_CACHE };

/** Campo de adjuntos de la tabla Artículos con la foto de la tela. */
export const CAMPO_FOTO = 'Imagen';

/**
 * Saldo inicial del cliente, en dólares: la tabla Clientes tiene un único
 * campo de saldo y ya está expresado en dólares ("Saldo Inicial USD").
 */
export type SaldoInicial = {
  cliente: string;
  /** Dólares. `null` no existe acá: sin monto cargado no hay saldo inicial. */
  monto: number;
};

/**
 * Lo que se vendió en una venta. Una cobranza no tiene nada de esto, así que
 * en las cobranzas el detalle directamente no existe.
 */
export type DetalleVenta = {
  /** Código del artículo. `null` cuando la venta no tiene artículo vinculado. */
  codigo: string | null;
  /** Descripción de la tela, leída del artículo vinculado. */
  descripcion: string | null;
  /**
   * Precio congelado al registrar la venta. No se usan los precios de lista de
   * la tabla Artículos: esos son referencia y cambian cuando se actualiza una
   * lista, así que una proforma vieja mostraría un precio que nunca se cobró.
   */
  precioUnitario: number | null;
  metros: number | null;
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
  /** Monto en la moneda de la operación. `null` si no está cargado. */
  monto: number | null;
  moneda: string | null;
  /**
   * El equivalente en dólares que ya trae calculado la base, con el tipo de
   * cambio cargado en la operación: "Venta en USD" y "Neto cobrado en USD".
   * La app no convierte: lee este campo y nada más.
   *
   * `null` cuando la base no pudo convertir —falta el tipo de cambio, o la
   * moneda no está contemplada en la fórmula—. Un `null` no es un cero: el
   * movimiento se muestra marcado y queda fuera del saldo.
   */
  montoUSD: number | null;
  /** Artículo, precio unitario y metros. Solo lo traen las ventas. */
  detalle?: DetalleVenta;
  /**
   * "Gastos de envío / Otros" de la venta. Es un campo en dólares, cargado a
   * mano, que no participa de ninguna fórmula de la base: no está dentro de
   * "Total Venta" ni de "Venta en USD". Se lee tal cual y nunca se convierte,
   * aunque la venta esté en otra moneda. `null` cuando está vacío; un cero
   * cargado es un cero real. Solo lo traen las ventas.
   */
  gastosEnvioUSD?: number | null;
  /**
   * "Descuento" de la venta. Ya viene restado dentro de "Total Venta" y de
   * "Venta en USD", así que es solo informativo: no se suma ni se resta en
   * ninguna parte. `null` cuando está vacío. Solo lo traen las ventas.
   */
  descuento?: number | null;
  /**
   * "Monto Bruto" y "Gastos asociados" de la cobranza, en su moneda. El monto
   * de la cobranza ya es el neto ("Neto cobrado"), así que esto es solo
   * informativo: no se suma ni se resta en ninguna parte. Solo lo traen las
   * cobranzas con gastos cargados.
   */
  gastosCobranza?: { bruto: number | null; gastos: number };
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
  const [clientes, articulos, registrosVentas, registrosCobranzas] =
    await Promise.all([
      leerTabla(TABLAS.clientes),
      indiceDeArticulos(),
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
    saldosIniciales.push({ cliente: razonSocial, monto });
  }

  const ventas: Movimiento[] = [];
  for (const venta of registrosVentas) {
    // El vínculo a cliente en Ventas admite uno solo. Sin vínculo, la venta
    // igual se registra: no se esconde plata que está cargada en la base.
    const [idCliente] = vinculos(venta, 'Cliente');
    const cliente = idCliente ? (nombreDeCliente.get(idCliente) ?? null) : null;

    // El artículo es un vínculo: la API devuelve el id y el código y la
    // descripción salen de resolverlo contra la tabla de artículos.
    const [idArticulo] = vinculos(venta, 'Artículo');
    const articulo = idArticulo ? articulos.get(idArticulo) : undefined;

    ventas.push({
      fecha: texto(venta, 'Fecha'),
      cliente,
      comprobante: texto(venta, 'Venta'),
      monto: numero(venta, 'Total Venta'),
      moneda: texto(venta, 'Moneda Venta'),
      montoUSD: numero(venta, 'Venta en USD'),
      detalle: {
        codigo: articulo?.codigo ?? null,
        descripcion: articulo?.descripcion ?? null,
        precioUnitario: numero(venta, 'Precio unitario (fijado)'),
        metros: numero(venta, 'Metros'),
      },
      gastosEnvioUSD: numero(venta, 'Gastos de envío / Otros'),
      descuento: numero(venta, 'Descuento'),
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
        // El neto en las dos columnas: así la fila cierra contra el tipo de
        // cambio. La resta de los gastos y la conversión ya vienen de la base.
        monto: numero(cobranza, 'Neto cobrado'),
        moneda: texto(cobranza, 'Moneda'),
        montoUSD: numero(cobranza, 'Neto cobrado en USD'),
        ...gastosDeCobranza(cobranza),
        ...(compartida ? { compartidoConOtrosClientes: true } : {}),
      });
    }
  }

  return { padron, saldosIniciales, ventas, cobranzas };
}

/**
 * Bruto y gastos de la cobranza, para la nota. Sin "Gastos asociados" cargado
 * no hay nota: el neto y el bruto coinciden.
 */
function gastosDeCobranza(
  cobranza: Registro,
): Pick<Movimiento, 'gastosCobranza'> {
  const gastos = numero(cobranza, 'Gastos asociados');
  if (gastos === null) return {};
  return {
    gastosCobranza: { bruto: numero(cobranza, 'Monto Bruto'), gastos },
  };
}

export type Articulo = {
  /** Código del artículo: el campo primario de la tabla. */
  codigo: string | null;
  /**
   * Descripción de la tela. Hoy está sin cargar en toda la base, así que la
   * columna sale en blanco: eso es lo esperado. No se rellena con el código
   * ni con ningún otro texto, porque sería inventar un dato que no está.
   */
  descripcion: string | null;
  /** Descripción en inglés ("Description"), para la proforma de EE. UU. */
  descripcionIngles: string | null;
  /**
   * Si el campo Imagen tiene algún adjunto. Es lo único que se guarda de la
   * foto: las URLs de Airtable caducan, así que la imagen se baja recién al
   * mostrarla, desde el servidor. Ver `src/lib/fotos.ts`.
   */
  tieneFoto: boolean;
};

/** Índice de artículos por id de registro, para resolver el vínculo de la venta. */
export async function indiceDeArticulos(): Promise<Map<string, Articulo>> {
  const registros = await leerTabla(TABLAS.articulos);

  const indice = new Map<string, Articulo>();
  for (const registro of registros) {
    indice.set(registro.id, {
      codigo: texto(registro, 'Artículo'),
      descripcion: texto(registro, 'Descripción'),
      descripcionIngles: texto(registro, 'Description'),
      tieneFoto: adjuntos(registro, CAMPO_FOTO).length > 0,
    });
  }
  return indice;
}
