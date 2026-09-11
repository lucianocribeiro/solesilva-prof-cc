'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef } from 'react';

import { Ausente } from '@/components/ausente';
import { Moneda } from '@/components/moneda';
import { Monto } from '@/components/monto';
import { LOGO, renglonesEmisor, type Empresa } from '@/lib/empresas';
import { fechaDeHoy } from '@/lib/fecha';
import { formatearFecha, formatearMonto } from '@/lib/formato';
import type { CamposDocumento, DocumentoProforma } from '@/lib/proformas';

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

  const ajustarAlto = useCallback(() => {
    const campo = referencia.current;
    if (!campo) return;
    campo.style.height = 'auto';
    campo.style.height = `${campo.scrollHeight}px`;
  }, []);

  useEffect(ajustarAlto, [ajustarAlto, valor]);

  // Al cambiar el ancho —girar el teléfono, abrir el teclado— el texto se
  // reparte en otra cantidad de renglones y la caja tiene que volver a medirse.
  useEffect(() => {
    window.addEventListener('resize', ajustarAlto);
    return () => window.removeEventListener('resize', ajustarAlto);
  }, [ajustarAlto]);

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
  empresa,
  campos,
  onCambiar,
}: {
  documento: DocumentoProforma;
  cliente: string;
  empresa: Empresa;
  campos: CamposDocumento;
  onCambiar: (campo: keyof CamposDocumento, valor: string) => void;
}) {
  const [nombreEmisor, ...datosEmisor] = renglonesEmisor(empresa);

  return (
    <article className="hoja">
      <header className="doc-encabezado">
        <div>
          {/* Se sirve el archivo tal cual, sin el optimizador: pesa 5 kB y
              así la pantalla, la impresión y el PDF muestran el mismo. Carga
              de entrada para que esté listo si se imprime enseguida. */}
          <Image
            src={LOGO}
            alt="Sole Silva"
            width={178}
            height={53}
            className="doc-logo"
            unoptimized
            priority
          />
          <h2 className="doc-titulo">Proforma</h2>
          <address className="doc-emisor">
            <span className="doc-emisor-nombre">{nombreEmisor}</span>
            {datosEmisor.map((dato) => (
              <span key={dato}>{dato}</span>
            ))}
          </address>
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

      {/* En pantallas angostas la tabla se reacomoda: cada renglón pasa a ser
          una ficha y el rótulo de cada monto sale del data-rotulo. En papel no
          cambia nada, sigue siendo la tabla de cinco columnas. */}
      <table className="doc-tabla">
        <colgroup>
          <col style={{ width: '24%' }} />
          <col style={{ width: '24%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '19%' }} />
          <col style={{ width: '19%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>Código</th>
            <th>Descripción</th>
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
              {/* La descripción sale del artículo vinculado. Si no está
                  cargada, la celda va vacía: es una proforma que ve el
                  cliente y no se inventa un texto que la base no tiene. */}
              <td className="doc-descripcion">{renglon.descripcion}</td>
              <td className="doc-num" data-rotulo="Metros">
                <Monto monto={renglon.metros} marca="Sin metros" />
              </td>
              <td className="doc-num" data-rotulo="Precio unitario">
                {renglon.precioUnitario === null ? (
                  <Ausente>Sin precio</Ausente>
                ) : (
                  <span>
                    {formatearMonto(renglon.precioUnitario)}{' '}
                    <Moneda moneda={documento.moneda} />
                  </span>
                )}
              </td>
              <td className="doc-num" data-rotulo="Total">
                {renglon.total === null ? (
                  <Ausente>Sin total</Ausente>
                ) : (
                  <span>
                    {formatearMonto(renglon.total)}{' '}
                    <Moneda moneda={documento.moneda} />
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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
