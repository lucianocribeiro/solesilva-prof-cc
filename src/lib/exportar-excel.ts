/**
 * Exportación de la cuenta corriente a Excel.
 *
 * El archivo se arma en el navegador con los datos que la pantalla ya tiene:
 * no se vuelve a leer Airtable. Si el archivo no coincidiera con lo que se ve,
 * la exportación no serviría.
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

/** Una fila por combinación de cliente y moneda. */
function filasDeSubtotales(bloques: BloqueCliente[]): Celda[][] {
  const filas: Celda[][] = [ENCABEZADOS_SUBTOTALES];

  for (const bloque of bloques) {
    for (const subtotal of bloque.subtotales) {
      // El saldo inicial solo va en la fila de su moneda: en las demás queda
      // vacío, porque para esa moneda no hay saldo inicial cargado.
      const linea = bloque.saldosIniciales.find(
        (saldo) => saldo.moneda === subtotal.moneda,
      );

      filas.push([
        etiquetaCliente(bloque.cliente),
        etiquetaMoneda(subtotal.moneda),
        linea ? linea.monto : null,
        subtotal.ventas,
        subtotal.cobranzas,
        subtotal.total,
      ]);
    }
  }

  return filas;
}

const ENCABEZADOS_MOVIMIENTOS = [
  'Cliente',
  'Fecha',
  'Tipo',
  'Comprobante',
  'Monto',
  'Moneda',
];

/**
 * Una fila por movimiento, ordenada por cliente y después por fecha: los
 * bloques ya vienen alfabéticos y los movimientos de cada uno por fecha.
 */
function filasDeMovimientos(bloques: BloqueCliente[]): Celda[][] {
  const filas: Celda[][] = [ENCABEZADOS_MOVIMIENTOS];

  for (const bloque of bloques) {
    for (const movimiento of bloque.movimientos) {
      filas.push([
        etiquetaCliente(bloque.cliente),
        aFechaExcel(movimiento.fecha),
        movimiento.tipo === 'venta' ? 'Venta' : 'Cobranza',
        movimiento.comprobante,
        // Las cobranzas van en negativo, igual que en pantalla.
        movimiento.aporte,
        etiquetaMoneda(movimiento.moneda),
      ]);
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
      anchos: [34, 13, 12, 16, 18, 14],
      montos: [4],
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
