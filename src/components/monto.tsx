import { Ausente } from '@/components/ausente';
import { formatearMonto, formatearMontoConSigno } from '@/lib/formato';

/**
 * Monto que puede no estar cargado. `marca` es lo que se muestra cuando falta.
 * `conSigno` explicita el "+" de los positivos, para los movimientos.
 */
export function Monto({
  monto,
  marca,
  conSigno = false,
}: {
  monto: number | null;
  marca: string;
  conSigno?: boolean;
}) {
  if (monto === null) return <Ausente>{marca}</Ausente>;
  return <>{conSigno ? formatearMontoConSigno(monto) : formatearMonto(monto)}</>;
}
