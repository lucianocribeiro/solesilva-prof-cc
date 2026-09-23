import { Ausente } from '@/components/ausente';
import { Fecha } from '@/components/fecha';
import { Moneda } from '@/components/moneda';
import { Monto } from '@/components/monto';
import type {
  BloqueCliente as Bloque,
  MovimientoCliente,
} from '@/lib/cuenta-corriente';
import { formatearMonto } from '@/lib/formato';

/**
 * Por qué el movimiento no entra al saldo. La app no lo deduce ni lo corrige:
 * la base no trajo equivalente, y eso es todo lo que se puede afirmar.
 */
const EXPLICACION_SIN_CONVERSION =
  'La base no trae el equivalente en dólares de este movimiento: puede faltar ' +
  'el tipo de cambio de la operación. Se muestra igual, pero no está sumado ' +
  'en el saldo.';

/** Celda del equivalente: el número, o la marca de que la base no lo trae. */
function EquivalenteUSD({ movimiento }: { movimiento: MovimientoCliente }) {
  if (movimiento.aporteUSD === null) {
    return (
      <span
        className="rounded border border-borde-fuerte px-1.5 py-0.5 text-[11px]
          text-texto-suave"
        title={EXPLICACION_SIN_CONVERSION}
      >
        Sin conversión
      </span>
    );
  }

  return <Monto monto={movimiento.aporteUSD} marca="Sin monto" conSigno />;
}

function Fila({ movimiento }: { movimiento: MovimientoCliente }) {
  const color =
    movimiento.tipo === 'venta' ? 'monto-positivo' : 'monto-negativo';

  return (
    <tr>
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
      <td>
        {movimiento.comprobante ?? <Ausente>Sin comprobante</Ausente>}
      </td>
      {/* El importe original, con su moneda: es lo que se concilia contra el
          comprobante del cliente. */}
      <td className={`tabla-num ${color}`}>
        <Monto monto={movimiento.aporte} marca="Sin monto" conSigno />
      </td>
      <td className="tabla-moneda">
        <Moneda moneda={movimiento.moneda} />
      </td>
      <td
        className={`tabla-num ${
          movimiento.aporteUSD === null ? '' : color
        }`}
      >
        <EquivalenteUSD movimiento={movimiento} />
      </td>
    </tr>
  );
}

export function BloqueCliente({ bloque }: { bloque: Bloque }) {
  const { saldoInicial, movimientos, subtotal, sinConversion } = bloque;
  const vacio = saldoInicial === null && movimientos.length === 0;

  return (
    <article className="panel">
      <header className="panel-encabezado">
        <h2 className="text-sm font-semibold tracking-tight">
          {bloque.cliente ?? (
            <Ausente>Movimientos sin cliente asignado</Ausente>
          )}
        </h2>
      </header>

      {vacio ? (
        <p className="px-4 py-3 text-sm texto-suave">
          Sin saldo inicial y sin movimientos.
        </p>
      ) : (
        <div className="tabla-scroll">
          <table className="tabla">
            <thead>
              <tr>
                <th className="w-28">Fecha</th>
                <th className="w-28">Tipo</th>
                <th>Comprobante</th>
                <th className="tabla-num w-40">Monto</th>
                <th className="w-20">Moneda</th>
                <th className="tabla-num w-40">Equivalente USD</th>
              </tr>
            </thead>

            <tbody>
              {saldoInicial !== null ? (
                <tr>
                  <td className="texto-suave">—</td>
                  <td className="texto-suave" colSpan={2}>
                    Saldo inicial
                  </td>
                  <td className="tabla-num">{formatearMonto(saldoInicial)}</td>
                  <td className="tabla-moneda">USD</td>
                  <td className="tabla-num">{formatearMonto(saldoInicial)}</td>
                </tr>
              ) : null}

              {movimientos.map((movimiento) => (
                <Fila key={movimiento.id} movimiento={movimiento} />
              ))}

              {movimientos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="texto-suave">
                    Sin movimientos.
                  </td>
                </tr>
              ) : null}
            </tbody>

            <tfoot>
              <tr>
                <td colSpan={5}>Saldo en dólares</td>
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
              </tr>

              {/* Sin este aviso, el saldo se leería como completo cuando no lo es. */}
              {sinConversion > 0 ? (
                <tr>
                  <td colSpan={6} className="aviso-saldo">
                    {sinConversion === 1
                      ? 'El saldo no incluye 1 movimiento sin equivalente en dólares.'
                      : `El saldo no incluye ${sinConversion} movimientos sin equivalente en dólares.`}
                  </td>
                </tr>
              ) : null}
            </tfoot>
          </table>
        </div>
      )}
    </article>
  );
}
