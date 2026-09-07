import { Ausente } from '@/components/ausente';
import { formatearFecha } from '@/lib/formato';

/**
 * Celda de fecha. Cuando el registro no tiene fecha cargada se muestra la
 * marca, nunca una celda vacía.
 */
export function Fecha({ fecha }: { fecha: string | null }) {
  if (fecha === null) return <Ausente>Sin fecha</Ausente>;
  return <span className="tabular-nums">{formatearFecha(fecha)}</span>;
}
