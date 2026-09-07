import { Ausente } from '@/components/ausente';

/**
 * Etiqueta de moneda. Cuando el registro no tiene moneda cargada se muestra la
 * marca en vez de inventar una: ningún monto queda sin su etiqueta al lado.
 */
export function Moneda({ moneda }: { moneda: string | null }) {
  if (moneda === null) return <Ausente>Sin moneda</Ausente>;
  return <span>{moneda}</span>;
}
