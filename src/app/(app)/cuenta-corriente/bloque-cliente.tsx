import { Ausente } from '@/components/ausente';
import { Fecha } from '@/components/fecha';
import { Moneda } from '@/components/moneda';
import { Monto } from '@/components/monto';
import type { BloqueCliente as Bloque } from '@/lib/cuenta-corriente';
import { formatearMonto } from '@/lib/formato';

export function BloqueCliente({ bloque }: { bloque: Bloque }) {
  return (
    <article className="panel">
      <header className="panel-encabezado">
        <h2 className="text-sm font-semibold tracking-tight">
          {bloque.cliente ?? (
            <Ausente>Movimientos sin cliente asignado</Ausente>
          )}
        </h2>
      </header>

      <div className="tabla-scroll">
        <table className="tabla">
        <thead>
          <tr>
            <th className="w-28">Fecha</th>
            <th>Movimiento</th>
            <th className="tabla-num w-44">Monto</th>
            <th className="w-28">Moneda</th>
          </tr>
        </thead>

        <tbody>
          {bloque.saldosIniciales.map((linea) => (
            <tr key={`saldo-${linea.moneda ?? 'sin-moneda'}`}>
              <td className="texto-suave">—</td>
              <td className="texto-suave">Saldo inicial</td>
              <td className="tabla-num">{formatearMonto(linea.monto)}</td>
              <td>
                <Moneda moneda={linea.moneda} />
              </td>
            </tr>
          ))}

          {bloque.movimientos.map((movimiento) => (
            <tr key={movimiento.id}>
              <td>
                <Fecha fecha={movimiento.fecha} />
              </td>
              <td>
                {movimiento.tipo === 'venta' ? 'Venta' : 'Cobranza'}
                {movimiento.compartidoConOtrosClientes ? (
                  <span
                    className="ml-2 rounded border border-borde-fuerte px-1.5 py-0.5
                      text-[11px] text-texto-suave"
                    title="En la base esta cobranza está vinculada a más de un cliente. Se muestra entera bajo cada uno, sin repartir el monto."
                  >
                    Compartida con otros clientes
                  </span>
                ) : null}
              </td>
              <td
                className={`tabla-num ${
                  movimiento.tipo === 'venta' ? 'monto-positivo' : 'monto-negativo'
                }`}
              >
                <Monto monto={movimiento.aporte} marca="Sin monto" conSigno />
              </td>
              <td>
                <Moneda moneda={movimiento.moneda} />
              </td>
            </tr>
          ))}

          {bloque.movimientos.length === 0 ? (
            <tr>
              <td colSpan={4} className="texto-suave">
                Sin movimientos.
              </td>
            </tr>
          ) : null}
        </tbody>

        <tfoot>
          {bloque.subtotales.map((subtotal) => (
            <tr key={`subtotal-${subtotal.moneda ?? 'sin-moneda'}`}>
              <td colSpan={2}>Subtotal</td>
              <td
                className={`tabla-num ${
                  subtotal.total > 0
                    ? 'monto-positivo'
                    : subtotal.total < 0
                      ? 'monto-negativo'
                      : ''
                }`}
              >
                {formatearMonto(subtotal.total)}
              </td>
              <td>
                <Moneda moneda={subtotal.moneda} />
              </td>
            </tr>
          ))}
        </tfoot>
        </table>
      </div>
    </article>
  );
}
