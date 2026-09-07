/**
 * Formato argentino: punto para miles, coma para decimales.
 * Todo lo que se muestre en pantalla pasa por acá.
 */

const formateadorMonto = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1234.5 -> "1.234,50". Los negativos ya vienen con su signo. */
export function formatearMonto(monto: number): string {
  // Evita que el cero negativo se muestre como "-0,00".
  return formateadorMonto.format(monto === 0 ? 0 : monto);
}

/** Igual que formatearMonto pero explicitando el "+" de los positivos. */
export function formatearMontoConSigno(monto: number): string {
  return monto > 0 ? `+${formatearMonto(monto)}` : formatearMonto(monto);
}

/**
 * "2026-06-18" -> "18/06/2026".
 * Si la fecha no tiene el formato esperado se devuelve tal cual vino: la
 * pantalla es un espejo de la base y no corrige lo que está cargado.
 */
export function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  if (!anio || !mes || !dia) return fecha;
  return `${dia}/${mes}/${anio}`;
}
