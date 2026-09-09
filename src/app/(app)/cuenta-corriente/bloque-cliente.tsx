import { Ausente } from '@/components/ausente';
import { Fecha } from '@/components/fecha';
import { Moneda } from '@/components/moneda';
import { Monto } from '@/components/monto';
import type {
  BloqueCliente as Bloque,
  SeccionMoneda,
} from '@/lib/cuenta-corriente';
import { formatearMonto } from '@/lib/formato';

/**
 * La cuenta corriente del cliente en una moneda: su saldo inicial, sus
 * movimientos y su subtotal. La moneda va en el encabezado y no en cada fila,
 * porque adentro de la sección no hay ninguna otra.
 */
function Seccion({ seccion }: { seccion: SeccionMoneda }) {
  return (
    <section className="seccion-moneda">
      <h3 className="seccion-moneda-titulo">
        <Moneda moneda={seccion.moneda} />
      </h3>

      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th className="w-28">Fecha</th>
              <th>Movimiento</th>
              <th className="tabla-num w-44">Monto</th>
            </tr>
          </thead>

          <tbody>
            {seccion.saldoInicial !== null ? (
              <tr>
                <td className="texto-suave">—</td>
                <td className="texto-suave">Saldo inicial</td>
                <td className="tabla-num">
                  {formatearMonto(seccion.saldoInicial)}
                </td>
              </tr>
            ) : null}

            {seccion.movimientos.map((movimiento) => (
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
                    movimiento.tipo === 'venta'
                      ? 'monto-positivo'
                      : 'monto-negativo'
                  }`}
                >
                  <Monto monto={movimiento.aporte} marca="Sin monto" conSigno />
                </td>
              </tr>
            ))}

            {seccion.movimientos.length === 0 ? (
              <tr>
                <td colSpan={3} className="texto-suave">
                  Sin movimientos.
                </td>
              </tr>
            ) : null}
          </tbody>

          <tfoot>
            <tr>
              <td colSpan={2}>Subtotal</td>
              <td
                className={`tabla-num ${
                  seccion.subtotal.total > 0
                    ? 'monto-positivo'
                    : seccion.subtotal.total < 0
                      ? 'monto-negativo'
                      : ''
                }`}
              >
                {formatearMonto(seccion.subtotal.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

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

      {bloque.secciones.length === 0 ? (
        <p className="px-4 py-3 text-sm texto-suave">
          Sin saldo inicial y sin movimientos.
        </p>
      ) : (
        bloque.secciones.map((seccion) => (
          <Seccion key={seccion.clave} seccion={seccion} />
        ))
      )}
    </article>
  );
}
