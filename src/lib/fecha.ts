/**
 * Helpers de fecha compartidos por cuenta corriente y proformas.
 *
 * Las fechas viajan como string ISO (AAAA-MM-DD) o `null` cuando el campo está
 * vacío en la base. Al ser ISO se ordenan comparando los strings.
 */

/** Fecha ascendente. Los registros sin fecha quedan siempre al final. */
export function compararFechas(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
}

/**
 * Fecha de hoy en formato ISO, tomada del reloj local.
 *
 * La usan el documento en pantalla y el PDF, para que la fecha de emisión sea
 * la misma en los dos lados.
 */
export function fechaDeHoy(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}
