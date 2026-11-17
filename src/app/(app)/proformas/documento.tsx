'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Ausente } from '@/components/ausente';
import { Moneda } from '@/components/moneda';
import { LOGO, renglonesEmisor, type Empresa } from '@/lib/empresas';
import { fechaDeHoy } from '@/lib/fecha';
import {
  FRACCIONES_COLUMNA,
  LADO_FOTO,
  UNIDADES,
  type CamposDocumento,
  type DocumentoProforma,
} from '@/lib/proformas';
import {
  descripcionEn,
  formatearFechaDocumento,
  formatearNumero,
  textosDe,
} from '@/lib/textos-proforma';

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

/**
 * Foto del artículo. Es un <img> y no un fondo de CSS, porque muchos
 * navegadores no imprimen los fondos. Carga enseguida y no en diferido: si se
 * imprime apenas se arma el documento, tiene que estar ya en la hoja.
 *
 * Si la foto no se puede traer, la celda queda vacía, igual que cuando el
 * artículo no tiene foto. No se muestra ningún ícono ni imagen de reemplazo.
 */
function FotoArticulo({ src, alt }: { src: string; alt: string }) {
  const [fallo, setFallo] = useState(false);
  if (fallo) return null;

  return (
    <Image
      src={src}
      alt={alt}
      width={LADO_FOTO}
      height={LADO_FOTO}
      className="doc-foto-imagen"
      unoptimized
      loading="eager"
      onError={() => setFallo(true)}
    />
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

  // Todo texto fijo y todo formato del documento sale del idioma de la
  // empresa emisora. Acá no se escribe ninguna etiqueta a mano.
  const { idioma } = empresa;
  const t = textosDe(idioma);
  const numero = (valor: number) => formatearNumero(idioma, valor);
  const moneda = <Moneda moneda={documento.moneda} marca={t.sinMoneda} />;

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
          <h2 className="doc-titulo">{t.titulo}</h2>
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
              <label htmlFor={`numero-${documento.clave}`}>{t.numero}</label>
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
            <dt className="doc-rotulo">{t.fechaEmision}</dt>
            <dd>{formatearFechaDocumento(idioma, fechaDeHoy())}</dd>
          </div>
          <div>
            <dt className="doc-rotulo">{t.moneda}</dt>
            <dd>{moneda}</dd>
          </div>
        </dl>
      </header>

      <hr className="doc-regla" />

      <section className="doc-cliente">
        <span className="doc-rotulo">{t.cliente}</span>
        <span className="doc-cliente-nombre">{cliente}</span>
      </section>

      {/* En pantallas angostas la tabla se reacomoda: cada renglón pasa a ser
          una ficha y el rótulo de cada monto sale del data-rotulo. En papel no
          cambia nada, sigue siendo la tabla de seis columnas. */}
      <table className="doc-tabla">
        <colgroup>
          {FRACCIONES_COLUMNA.map((fraccion, indice) => (
            <col key={indice} style={{ width: `${fraccion * 100}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th>
              <span className="sr-only">{t.foto}</span>
            </th>
            <th>{t.codigo}</th>
            <th>{t.descripcion}</th>
            <th className="doc-num">{t.cantidad}</th>
            <th className="doc-num">{t.precioUnitario}</th>
            <th className="doc-num">{t.total}</th>
          </tr>
        </thead>
        <tbody>
          {documento.renglones.map((renglon) => (
            <tr key={renglon.id}>
              {/* Sin foto en Airtable, la celda va vacía: nada adentro, ni
                  siquiera un espacio, para que la ficha del celular la pueda
                  plegar con :empty. */}
              <td className="doc-foto">
                {renglon.foto ? (
                  <FotoArticulo
                    src={renglon.foto}
                    alt={t.altFoto(renglon.codigo)}
                  />
                ) : null}
              </td>
              <td>
                <span className="block font-medium">
                  {renglon.codigo ?? <Ausente>{t.sinArticulo}</Ausente>}
                </span>
                {renglon.observaciones ? (
                  <span className="doc-obs">{renglon.observaciones}</span>
                ) : null}
              </td>
              {/* La descripción sale del artículo vinculado. Si no está
                  cargada, la celda va vacía: es una proforma que ve el
                  cliente y no se inventa un texto que la base no tiene. */}
              <td className="doc-descripcion">
                {descripcionEn(idioma, renglon)}
              </td>
              {/* Cada renglón lleva su unidad: el mismo documento puede tener
                  renglones en metros y en yardas. */}
              <td className="doc-num" data-rotulo={t.cantidad}>
                {renglon.cantidad === null ? (
                  <Ausente>{t.sinCantidad}</Ausente>
                ) : (
                  <span>
                    {numero(renglon.cantidad)}{' '}
                    {UNIDADES[renglon.unidad].abreviatura}
                  </span>
                )}
              </td>
              <td className="doc-num" data-rotulo={t.precioUnitario}>
                {renglon.precioUnitario === null ? (
                  <Ausente>{t.sinPrecio}</Ausente>
                ) : (
                  <span>
                    {numero(renglon.precioUnitario)} {moneda}
                    {' / '}
                    {UNIDADES[renglon.unidad].abreviatura}
                  </span>
                )}
              </td>
              <td className="doc-num" data-rotulo={t.total}>
                {renglon.total === null ? (
                  <Ausente>{t.sinTotal}</Ausente>
                ) : (
                  <span>
                    {numero(renglon.total)} {moneda}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="doc-totales">
        {documento.totalesPorUnidad.map(({ unidad, cantidad }) => (
          <div key={unidad} className="doc-total">
            <span className="doc-total-rotulo">{t.unidades[unidad]}</span>
            <span className="doc-total-valor">
              {numero(cantidad)} {UNIDADES[unidad].abreviatura}
            </span>
          </div>
        ))}
        <div className="doc-total">
          <span className="doc-total-rotulo">{t.renglones}</span>
          <span className="doc-total-valor">{documento.cantidadRenglones}</span>
        </div>
        <div className="doc-total-final">
          <span className="doc-total-final-rotulo">{t.total}</span>
          <span className="doc-total-final-valor">
            {numero(documento.total)}{' '}
            <span className="text-sm">{moneda}</span>
          </span>
        </div>
      </section>

      <section className="doc-pie">
        <div>
          <span className="doc-rotulo">
            <label htmlFor={`observaciones-${documento.clave}`}>
              {t.observaciones}
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
              {t.condiciones}
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
