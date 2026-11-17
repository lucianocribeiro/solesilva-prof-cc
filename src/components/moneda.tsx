import { Ausente } from '@/components/ausente';

/**
 * Etiqueta de moneda. Cuando el registro no tiene moneda cargada se muestra la
 * marca en vez de inventar una: ningún monto queda sin su etiqueta al lado.
 */
export function Moneda({
  moneda,
  marca = 'Sin moneda',
}: {
  moneda: string | null;
  /** Texto de la marca. La proforma en inglés pasa el suyo. */
  marca?: string;
}) {
  if (moneda === null) return <Ausente>{marca}</Ausente>;
  return <span>{moneda}</span>;
}
