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
