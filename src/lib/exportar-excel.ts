/**
 * Exportación de la cuenta corriente a Excel.
 *
 * El archivo se arma en el navegador con los datos que la pantalla ya tiene:
 * no se vuelve a leer Airtable. La regla es una sola y no tiene excepciones:
 * el Excel exporta exactamente lo que se ve en pantalla. Si el archivo no
 * coincidiera con lo que se ve, la exportación no serviría.
 *
 * Sigue valiendo que la app es un espejo: los montos van como números, las
 * fechas como fechas, y un campo ausente queda como celda vacía. Un monto que
 * no existe y un monto de cero son cosas distintas.
 */

import type { BloqueCliente } from '@/lib/cuenta-corriente';

/** Cómo se identifica en el archivo el bloque sin cliente vinculado. */
const ETIQUETA_SIN_CLIENTE = 'Movimientos sin cliente asignado';

/** Mismo criterio que la pantalla para la moneda que no está cargada. */
const ETIQUETA_SIN_MONEDA = 'Sin moneda';

const FORMATO_MONTO = '#,##0.00';
const FORMATO_FECHA = 'dd/mm/yyyy';

/** `null` produce una celda vacía, no un cero ni una cadena. */
type Celda = string | number | null;

function etiquetaCliente(cliente: string | null): string {
  return cliente ?? ETIQUETA_SIN_CLIENTE;
}

function etiquetaMoneda(moneda: string | null): string {
  return moneda ?? ETIQUETA_SIN_MONEDA;
}

/** Días entre el 30/12/1899, origen del calendario de Excel, y el 1/1/1970. */
const ORIGEN_EXCEL = 25569;

const MILISEGUNDOS_POR_DIA = 86_400_000;

/**
 * "2026-08-12" al número de serie con el que Excel guarda las fechas.
 *
 * Se escribe el serial y no un Date porque un Date se serializa como
 * instante UTC y, en cualquier zona detrás de Greenwich, la celda termina
 * mostrando el día anterior. El serial no depende de la zona horaria, y una
 * celda numérica con formato de fecha es exactamente cómo Excel guarda una
 * fecha: se ordena y se filtra como fecha.
 */
function aFechaExcel(fecha: string | null): number | null {
  if (fecha === null) return null;
  const [anio, mes, dia] = fecha.split('-').map(Number);
  if (!anio || !mes || !dia) return null;
  return Date.UTC(anio, mes - 1, dia) / MILISEGUNDOS_POR_DIA + ORIGEN_EXCEL;
}

function nombreDeArchivo(hoy: Date): string {
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `cuenta-corriente-${hoy.getFullYear()}-${mes}-${dia}.xlsx`;
}

/* --- Filas de cada hoja ------------------------------------------------- */

const ENCABEZADOS_SUBTOTALES = [
  'Cliente',
  'Moneda',
  'Saldo inicial',
  'Ventas',
  'Cobranzas',
  'Subtotal',
];

/** Una fila por sección: cada cliente aporta una fila por cada moneda suya. */
function filasDeSubtotales(bloques: BloqueCliente[]): Celda[][] {
  const filas: Celda[][] = [ENCABEZADOS_SUBTOTALES];

  for (const bloque of bloques) {
    for (const seccion of bloque.secciones) {
      filas.push([
        etiquetaCliente(bloque.cliente),
        etiquetaMoneda(seccion.moneda),
        // Sin saldo inicial cargado la celda queda vacía: no es un cero.
        seccion.saldoInicial,
        seccion.subtotal.ventas,
        seccion.subtotal.cobranzas,
        seccion.subtotal.total,
      ]);
    }
  }

  return filas;
}

/** El orden lo pidió el cliente. Si se toca, cada fila tiene que seguirlo. */
const ENCABEZADOS_MOVIMIENTOS = [
  'Cliente',
  'Fecha',
  'Tipo',
  'Comprobante',
  'Código de artículo',
  'Metros',
  'Descripción del artículo',
  'Precio unitario',
  'Moneda',
  'Monto',
];

/**
 * Una fila por movimiento, ordenada por cliente, después por moneda y después
 * por fecha: los bloques ya vienen alfabéticos, las secciones de cada bloque
 * ordenadas por moneda y los movimientos de cada sección por fecha ascendente.
 *
 * Código, metros, descripción y precio unitario son de la venta. Una cobranza
 * no tiene ninguno, así que esas celdas quedan vacías: no es un cero y no se
 * rellenan con nada.
 */
function filasDeMovimientos(bloques: BloqueCliente[]): Celda[][] {
  const filas: Celda[][] = [ENCABEZADOS_MOVIMIENTOS];

  for (const bloque of bloques) {
    for (const seccion of bloque.secciones) {
      for (const movimiento of seccion.movimientos) {
        const detalle = movimiento.detalle;

        filas.push([
          etiquetaCliente(bloque.cliente),
          aFechaExcel(movimiento.fecha),
          movimiento.tipo === 'venta' ? 'Venta' : 'Cobranza',
          movimiento.comprobante,
          detalle?.codigo ?? null,
          detalle?.metros ?? null,
          detalle?.descripcion ?? null,
          detalle?.precioUnitario ?? null,
          etiquetaMoneda(seccion.moneda),
          // Las cobranzas van en negativo, igual que en pantalla.
          movimiento.aporte,
        ]);
      }
    }
  }

  return filas;
}

/* --- Armado del archivo -------------------------------------------------- */

export async function exportarCuentaCorriente(
  bloques: BloqueCliente[],
): Promise<void> {
  // Se carga a pedido: es pesada y solo hace falta al exportar.
  const XLSX = await import('xlsx');

  const libro = XLSX.utils.book_new();

  const hojas = [
    {
      nombre: 'Subtotales',
      filas: filasDeSubtotales(bloques),
      anchos: [34, 14, 16, 16, 16, 18],
      // Columnas con formato de monto: saldo inicial, ventas, cobranzas y subtotal.
      montos: [2, 3, 4, 5],
      fechas: [] as number[],
    },
    {
      nombre: 'Movimientos',
      filas: filasDeMovimientos(bloques),
      anchos: [34, 13, 12, 16, 20, 12, 40, 16, 14, 18],
      // Metros, precio unitario y monto.
      montos: [5, 7, 9],
      fechas: [1],
    },
  ];

  for (const hoja of hojas) {
    const ws = XLSX.utils.aoa_to_sheet(hoja.filas);

    ws['!cols'] = hoja.anchos.map((wch) => ({ wch }));

    // Formato numérico y de fecha. Las celdas vacías no existen y se saltan.
    for (let fila = 1; fila < hoja.filas.length; fila += 1) {
      for (const columna of hoja.montos) {
        const celda = ws[XLSX.utils.encode_cell({ r: fila, c: columna })];
        if (celda) celda.z = FORMATO_MONTO;
      }
      for (const columna of hoja.fechas) {
        const celda = ws[XLSX.utils.encode_cell({ r: fila, c: columna })];
        if (celda) celda.z = FORMATO_FECHA;
      }
    }

    XLSX.utils.book_append_sheet(libro, ws, hoja.nombre);
  }

  const archivo = XLSX.write(libro, {
    type: 'array',
    bookType: 'xlsx',
  }) as ArrayBuffer;

  const url = URL.createObjectURL(
    new Blob([archivo as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  );

  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreDeArchivo(new Date());
  document.body.append(enlace);
  enlace.click();
  enlace.remove();

  // Liberar la URL en el mismo tick puede cortar la descarga antes de que el
  // navegador termine de leer el blob.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
