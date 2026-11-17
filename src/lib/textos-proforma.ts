/**
 * Idioma del documento de la proforma.
 *
 * El idioma lo define la empresa emisora: la argentina emite en castellano y la
 * estadounidense en inglés. Esto alcanza solo al papel —el documento en
 * pantalla, la impresión, la vista de celular y el PDF—. La interfaz de la app
 * (filtros, selección de renglones, botones) sigue en castellano siempre.
 *
 * Todo texto fijo del documento sale de acá. Ni la pantalla ni el PDF escriben
 * una etiqueta por su cuenta: así las cuatro salidas dicen exactamente lo
 * mismo y no queda ninguna palabra suelta en el otro idioma.
 *
 * Los números y la fecha también cambian, pero solo en cómo se escriben: los
 * importes y las cantidades son los mismos que trae Airtable y acá no se
 * calcula ni se convierte nada.
 */

import type { Unidad } from '@/lib/renglones-venta';

export type Idioma = 'es' | 'en';

export type TextosProforma = {
  titulo: string;
  numero: string;
  fechaEmision: string;
  moneda: string;
  cliente: string;
  codigo: string;
  descripcion: string;
  cantidad: string;
  precioUnitario: string;
  total: string;
  renglones: string;
  observaciones: string;
  condiciones: string;
  /** Nombre de cada unidad en el pie. Las abreviaturas (m, yd) no cambian. */
  unidades: Record<Unidad, string>;
  /** Columna de la foto: no se ve, la leen los lectores de pantalla. */
  foto: string;
  /** Texto alternativo de la foto de un artículo. */
  altFoto: (codigo: string | null) => string;
  /** Marcas de dato ausente en la base. */
  sinArticulo: string;
  sinCantidad: string;
  sinPrecio: string;
  sinTotal: string;
  sinMoneda: string;
  /** Texto con el que arranca el bloque de condiciones. Editable en pantalla. */
  condicionesPorDefecto: string;
};

/**
 * "Total" se escribe igual en los dos idiomas: es una etiqueta más, no un
 * olvido. Se define una vez y la usan los dos diccionarios, tanto para el total
 * de cada renglón como para el total del pie.
 */
const TOTAL = 'Total';

const CASTELLANO: TextosProforma = {
  titulo: 'Proforma',
  numero: 'N.º de proforma',
  fechaEmision: 'Fecha de emisión',
  moneda: 'Moneda',
  cliente: 'Cliente',
  codigo: 'Código',
  descripcion: 'Descripción',
  cantidad: 'Cantidad',
  precioUnitario: 'Precio unitario',
  total: TOTAL,
  renglones: 'Renglones',
  observaciones: 'Observaciones',
  condiciones: 'Condiciones y validez',
  unidades: { metros: 'Metros', yardas: 'Yardas' },
  foto: 'Foto',
  altFoto: (codigo) => (codigo ? `Tela ${codigo}` : 'Tela'),
  sinArticulo: 'Sin artículo',
  sinCantidad: 'Sin cantidad',
  sinPrecio: 'Sin precio',
  sinTotal: 'Sin total',
  sinMoneda: 'Sin moneda',
  condicionesPorDefecto:
    'Validez de la proforma: 15 días corridos desde la fecha de emisión.\n' +
    'Los precios están sujetos a confirmación de stock al momento del pedido.\n' +
    'Forma de pago y plazo de entrega a convenir con la orden de compra.',
};

const INGLES: TextosProforma = {
  titulo: 'Proforma Invoice',
  numero: 'Proforma no.',
  fechaEmision: 'Issue date',
  moneda: 'Currency',
  cliente: 'Client',
  codigo: 'Code',
  descripcion: 'Description',
  cantidad: 'Quantity',
  precioUnitario: 'Unit price',
  total: TOTAL,
  renglones: 'Line items',
  observaciones: 'Notes',
  condiciones: 'Terms and validity',
  unidades: { metros: 'Meters', yardas: 'Yards' },
  foto: 'Photo',
  altFoto: (codigo) => (codigo ? `Fabric ${codigo}` : 'Fabric'),
  sinArticulo: 'No item',
  sinCantidad: 'No quantity',
  sinPrecio: 'No price',
  sinTotal: 'No total',
  sinMoneda: 'No currency',
  condicionesPorDefecto:
    'This proforma invoice is valid for 15 calendar days from the date of issue.\n' +
    'Prices are subject to stock confirmation at the time the order is placed.\n' +
    'Payment terms and delivery lead time will be agreed upon when the purchase order is placed.',
};

const TEXTOS: Record<Idioma, TextosProforma> = { es: CASTELLANO, en: INGLES };

export function textosDe(idioma: Idioma): TextosProforma {
  return TEXTOS[idioma];
}

/* --- Números ------------------------------------------------------------ */

const FORMATEADORES: Record<Idioma, Intl.NumberFormat> = {
  // Coma decimal y punto de miles: 1.234,56.
  es: new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
  // Punto decimal y coma de miles: 1,234.56.
  en: new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
};

/** Cantidades e importes del documento, con dos decimales. */
export function formatearNumero(idioma: Idioma, valor: number): string {
  // Evita que el cero negativo se muestre como "-0,00".
  return FORMATEADORES[idioma].format(valor === 0 ? 0 : valor);
}

/* --- Fecha -------------------------------------------------------------- */

const MESES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Fecha ISO para el documento. En castellano, día/mes/año: 17/11/2026. En
 * inglés, con el mes escrito: November 17, 2026. En Estados Unidos 17/11/2026
 * se lee como mes/día, y con el mes en palabras no hay forma de confundirlo.
 *
 * Se arma a mano y no con `Date`, para que ningún huso horario corra el día.
 * Si la fecha no tiene el formato esperado se devuelve tal cual vino.
 */
export function formatearFechaDocumento(idioma: Idioma, fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  if (!anio || !mes || !dia) return fecha;
  if (idioma === 'es') return `${dia}/${mes}/${anio}`;

  const nombreMes = MESES_EN[Number(mes) - 1];
  if (!nombreMes) return fecha;
  return `${nombreMes} ${Number(dia)}, ${anio}`;
}

/* --- Descripción del artículo ------------------------------------------ */

/**
 * Descripción del renglón en el idioma del documento: el campo "Descripción"
 * o el campo "Description" de la tabla Artículos. Si el artículo no tiene
 * cargado ese campo, la celda va vacía: no se usa el del otro idioma.
 */
export function descripcionEn(
  idioma: Idioma,
  renglon: { descripcion: string | null; descripcionIngles: string | null },
): string | null {
  return idioma === 'en' ? renglon.descripcionIngles : renglon.descripcion;
}
