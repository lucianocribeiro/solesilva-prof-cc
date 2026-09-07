/**
 * Helpers de moneda compartidos por cuenta corriente y proformas.
 *
 * Acá no hay ninguna lista de monedas ni se conoce ningún código en particular.
 * La moneda es el valor que trae el campo; lo único que se distingue es la
 * ausencia de moneda, representada por `null`.
 */

/** Un campo de moneda vacío y uno ausente son el mismo caso: sin moneda. */
export function normalizarMoneda(moneda: string | null): string | null {
  if (moneda === null) return null;
  const limpia = moneda.trim();
  return limpia === '' ? null : limpia;
}

/** Las monedas se ordenan alfabéticamente y "sin moneda" queda al final. */
export function compararMonedas(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b, 'es');
}

/** Clave estable para usar la moneda en un objeto o en una key de React. */
export function claveMoneda(moneda: string | null): string {
  return moneda ?? '__sin_moneda__';
}

/** Redondeo a dos decimales, solo para que la suma no arrastre ruido binario. */
export function redondear(monto: number): number {
  return Math.round(monto * 100) / 100;
}
