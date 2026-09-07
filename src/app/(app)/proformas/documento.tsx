'use client';

import { useEffect, useRef } from 'react';

import { Ausente } from '@/components/ausente';
import { Moneda } from '@/components/moneda';
import { Monto } from '@/components/monto';
import { formatearFecha, formatearMonto } from '@/lib/formato';
import type { DocumentoProforma } from '@/lib/proformas';

export type CamposDocumento = {
  numero: string;
  observaciones: string;
  condiciones: string;
};

export const CONDICIONES_POR_DEFECTO =
  'Validez de la proforma: 15 días corridos desde la fecha de emisión.\n' +
  'Los precios están sujetos a confirmación de stock al momento del pedido.\n' +
  'Forma de pago y plazo de entrega a convenir con la orden de compra.';

/** Fecha de hoy en formato ISO, tomada del reloj local. */
function fechaDeHoy(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

/**
 * Textarea que crece con su contenido, para que en papel no quede texto
 * cortado ni una barra de scroll.
 */
function AreaEditable({
  id,
  valor,
  onCambiar,
}: {
  id: string;
  valor: string;
  onCambiar: (valor: string) => void;
}) {
  const referencia = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const campo = referencia.current;
    if (!campo) return;
    campo.style.height = 'auto';
    campo.style.height = `${campo.scrollHeight}px`;
  }, [valor]);

  return (
    <>
      <textarea
        id={id}
        ref={referencia}
        className="doc-area"
        rows={1}
        value={valor}
        onChange={(evento) => onCambiar(evento.target.value)}
      />
      <p className="doc-impreso">{valor}</p>
    </>
  );
}

export function Documento({
  documento,
  cliente,
  campos,
  onCambiar,
}: {
  documento: DocumentoProforma;
  cliente: string;
  campos: CamposDocumento;
  onCambiar: (campo: keyof CamposDocumento, valor: string) => void;
}) {
  return (
    <article className="hoja">
      <header className="doc-encabezado">
        <div>
          <h2 className="doc-titulo">Proforma</h2>
          <span className="doc-aclaracion">
            No es una factura ni un comprobante fiscal
          </span>
        </div>

        <dl className="doc-meta">
          <div>
            <dt className="doc-rotulo">
              <label htmlFor={`numero-${documento.clave}`}>N.º de proforma</label>
            </dt>
            <dd>
              <input
                id={`numero-${documento.clave}`}
                className="doc-campo"
                value={campos.numero}
                onChange={(evento) => onCambiar('numero', evento.target.value)}
              />
              <span className="doc-impreso">{campos.numero}</span>
            </dd>
          </div>
          <div>
            <dt className="doc-rotulo">Fecha de emisión</dt>
            <dd>{formatearFecha(fechaDeHoy())}</dd>
          </div>
          <div>
            <dt className="doc-rotulo">Moneda</dt>
            <dd>
              <Moneda moneda={documento.moneda} />
            </dd>
          </div>
        </dl>
      </header>

      <hr className="doc-regla" />

      <section className="doc-cliente">
        <span className="doc-rotulo">Cliente</span>
        <span className="doc-cliente-nombre">{cliente}</span>
      </section>

      <div className="tabla-scroll">
        <table className="doc-tabla">
        <colgroup>
          <col style={{ width: '42%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '22%' }} />
          <col style={{ width: '22%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>Código</th>
            <th className="doc-num">Metros</th>
            <th className="doc-num">Precio unitario</th>
            <th className="doc-num">Total</th>
          </tr>
        </thead>
        <tbody>
          {documento.renglones.map((renglon) => (
            <tr key={renglon.id}>
              <td>
                <span className="block font-medium">
                  {renglon.codigo ?? <Ausente>Sin artículo</Ausente>}
                </span>
                {renglon.observaciones ? (
                  <span className="doc-obs">{renglon.observaciones}</span>
                ) : null}
              </td>
              <td className="doc-num">
                <Monto monto={renglon.metros} marca="Sin metros" />
              </td>
              <td className="doc-num">
                {renglon.precioUnitario === null ? (
                  <Ausente>Sin precio</Ausente>
                ) : (
                  <>
                    {formatearMonto(renglon.precioUnitario)}{' '}
                    <Moneda moneda={documento.moneda} />
                  </>
                )}
              </td>
              <td className="doc-num">
                {renglon.total === null ? (
                  <Ausente>Sin total</Ausente>
                ) : (
                  <>
                    {formatearMonto(renglon.total)}{' '}
                    <Moneda moneda={documento.moneda} />
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>

      <section className="doc-totales">
        <div className="doc-total">
          <span className="doc-total-rotulo">Metros</span>
          <span className="doc-total-valor">
            {formatearMonto(documento.totalMetros)}
          </span>
        </div>
        <div className="doc-total">
          <span className="doc-total-rotulo">Renglones</span>
          <span className="doc-total-valor">{documento.cantidadRenglones}</span>
        </div>
        <div className="doc-total-final">
          <span className="doc-total-final-rotulo">Total</span>
          <span className="doc-total-final-valor">
            {formatearMonto(documento.total)}{' '}
            <span className="text-sm">
              <Moneda moneda={documento.moneda} />
            </span>
          </span>
        </div>
      </section>

      <section className="doc-pie">
        <div>
          <span className="doc-rotulo">
            <label htmlFor={`observaciones-${documento.clave}`}>
              Observaciones
            </label>
          </span>
          <AreaEditable
            id={`observaciones-${documento.clave}`}
            valor={campos.observaciones}
            onCambiar={(valor) => onCambiar('observaciones', valor)}
          />
        </div>
        <div>
          <span className="doc-rotulo">
            <label htmlFor={`condiciones-${documento.clave}`}>
              Condiciones y validez
            </label>
          </span>
          <AreaEditable
            id={`condiciones-${documento.clave}`}
            valor={campos.condiciones}
            onCambiar={(valor) => onCambiar('condiciones', valor)}
          />
        </div>
      </section>
    </article>
  );
}
