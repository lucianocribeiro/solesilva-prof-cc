'use client';

import { useEffect, useState } from 'react';

import { Ausente } from '@/components/ausente';
import { Fecha } from '@/components/fecha';
import { Moneda } from '@/components/moneda';
import { Monto } from '@/components/monto';
import { compartirArchivo, sePuedeCompartirArchivos } from '@/lib/compartir';
import { EMPRESAS, empresaPorClave } from '@/lib/empresas';
import { fechaDeHoy } from '@/lib/fecha';
import { formatearFecha } from '@/lib/formato';
import { generarPdfProforma, precargarPdf } from '@/lib/pdf-proforma';
import {
  armarDocumentos,
  clientesConVentas,
  CONDICIONES_POR_DEFECTO,
  fechasDeCliente,
  renglonesDe,
  TODAS_LAS_FECHAS,
  type CamposDocumento,
  type FiltroFecha,
} from '@/lib/proformas';
import type { RenglonVenta } from '@/lib/renglones-venta';

import { Documento } from './documento';

/** Valor del <option> que representa los renglones sin fecha cargada. */
const SIN_FECHA = '__sin_fecha__';

function claveFecha(fecha: string | null): string {
  return fecha ?? SIN_FECHA;
}

function etiquetaFecha(fecha: string | null): string {
  return fecha === null ? 'Sin fecha' : formatearFecha(fecha);
}

/** El valor del <select> se traduce al filtro que entiende la lógica pura. */
function filtroDesdeSelect(valor: string): FiltroFecha {
  if (valor === '') return TODAS_LAS_FECHAS;
  if (valor === SIN_FECHA) return null;
  return valor;
}

export function PantallaProformas({ renglones }: { renglones: RenglonVenta[] }) {
  // Arranca sin empresa a propósito: emitir con la equivocada por no haber
  // mirado el selector es peor que tener que elegirla cada vez.
  const [claveEmpresa, setClaveEmpresa] = useState('');
  const [cliente, setCliente] = useState('');
  const [fechaElegida, setFechaElegida] = useState('');
  const [tildados, setTildados] = useState<string[]>([]);
  const [indiceActivo, setIndiceActivo] = useState(0);
  const [campos, setCampos] = useState<Record<string, CamposDocumento>>({});

  const [generando, setGenerando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [errorPdf, setErrorPdf] = useState<string | null>(null);

  /**
   * Si el navegador puede compartir archivos se sabe recién en el cliente, así
   * que el botón nace rotulado "Descargar PDF" y se corrige después del primer
   * render. Nunca dice "Compartir" donde no se puede compartir.
   */
  const [puedeCompartir, setPuedeCompartir] = useState(false);
  useEffect(() => setPuedeCompartir(sePuedeCompartirArchivos()), []);

  const empresa = empresaPorClave(claveEmpresa);

  const clientes = clientesConVentas(renglones);
  const fechas = cliente ? fechasDeCliente(renglones, cliente) : [];

  // El cliente es obligatorio; la fecha es un filtro opcional sobre sus renglones.
  const disponibles = cliente
    ? renglonesDe(renglones, cliente, filtroDesdeSelect(fechaElegida))
    : [];

  const seleccionados = disponibles.filter((renglon) =>
    tildados.includes(renglon.id),
  );

  // Sin empresa no se arma ningún documento. La empresa no toca el corte por
  // moneda: si salen varios documentos, todos llevan la misma.
  const documentos = empresa
    ? armarDocumentos(seleccionados, cliente, fechaDeHoy())
    : [];
  const activo = Math.min(indiceActivo, Math.max(documentos.length - 1, 0));
  const documento = documentos[activo];

  /**
   * El aviso habla del archivo que se acaba de generar. Si cambia lo que está
   * en pantalla —otra empresa, otra moneda, otros renglones tildados— deja de
   * corresponder, así que se borra.
   */
  const firmaDelDocumento = documento
    ? `${claveEmpresa}|${documento.clave}|${documento.renglones.map((r) => r.id).join(',')}`
    : '';

  useEffect(() => {
    setAviso(null);
    setErrorPdf(null);
  }, [firmaDelDocumento]);

  const camposDelDocumento = (clave: string, numeroSugerido: string) =>
    campos[clave] ?? {
      numero: numeroSugerido,
      observaciones: '',
      condiciones: CONDICIONES_POR_DEFECTO,
    };

  function elegirCliente(nuevo: string) {
    setCliente(nuevo);
    setFechaElegida('');
    setTildados([]);
    setIndiceActivo(0);
    // Lo escrito sobre el documento era de otro cliente, empezando por el
    // número: si se conservara, la proforma saldría con las iniciales del
    // cliente anterior.
    setCampos({});
  }

  function elegirFecha(nueva: string) {
    setFechaElegida(nueva);
    setTildados([]);
    setIndiceActivo(0);
  }

  function alternar(id: string) {
    setTildados((previos) =>
      previos.includes(id)
        ? previos.filter((otro) => otro !== id)
        : [...previos, id],
    );
  }

  function cambiarCampo(campo: keyof CamposDocumento, valor: string) {
    if (!documento) return;
    const actuales = camposDelDocumento(documento.clave, documento.numeroSugerido);
    setCampos((previos) => ({
      ...previos,
      [documento.clave]: { ...actuales, [campo]: valor },
    }));
  }

  /**
   * Genera el PDF del documento que se está viendo —uno solo, el de la moneda
   * abierta, igual que la impresión— y lo pasa al menú de compartir del
   * sistema. Donde ese menú no existe, el archivo se descarga y se avisa que
   * hay que adjuntarlo a mano.
   */
  async function compartir() {
    if (!documento || !empresa) return;

    setGenerando(true);
    setAviso(null);
    setErrorPdf(null);

    try {
      const datos = camposDelDocumento(documento.clave, documento.numeroSugerido);
      const archivo = await generarPdfProforma({
        documento,
        cliente,
        campos: datos,
        fecha: fechaDeHoy(),
        empresa,
      });

      const resultado = await compartirArchivo(
        archivo,
        `Proforma ${datos.numero} — ${cliente}`,
      );

      if (resultado === 'descargado') {
        setAviso(
          'Se descargó el PDF. Para mandarlo por WhatsApp, adjuntalo a mano desde la conversación.',
        );
      }
      // Compartido no necesita aviso, y cancelado tampoco: no es un error.
    } catch {
      setErrorPdf('No se pudo generar el PDF. Probá de nuevo.');
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div>
      <section className="no-imprimir">
        <h1 className="titulo-pagina">Proformas</h1>
        <p className="mt-1 text-sm texto-suave">
          Elegí la empresa que emite y un cliente, y tildá los renglones que van
          en la proforma. La fecha es un filtro opcional: sin elegir ninguna se
          ven todos sus renglones. Si hay más de una moneda sale un documento
          por cada una, todos de la misma empresa.
        </p>

        <div className="panel mt-6 flex flex-wrap gap-4 p-4 sm:gap-6">
          <div className="w-full sm:w-56">
            <label className="etiqueta" htmlFor="empresa">
              Empresa emisora
            </label>
            <select
              id="empresa"
              className="campo"
              value={claveEmpresa}
              onChange={(evento) => setClaveEmpresa(evento.target.value)}
            >
              <option value="">Elegí una empresa</option>
              {EMPRESAS.map((opcion) => (
                <option key={opcion.clave} value={opcion.clave}>
                  {opcion.etiqueta}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-72">
            <label className="etiqueta" htmlFor="cliente">
              Cliente
            </label>
            <select
              id="cliente"
              className="campo"
              value={cliente}
              onChange={(evento) => elegirCliente(evento.target.value)}
            >
              <option value="">Elegí un cliente</option>
              {clientes.map((nombre) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-56">
            <label className="etiqueta" htmlFor="fecha">
              Fecha
            </label>
            <select
              id="fecha"
              className="campo"
              value={fechaElegida}
              disabled={!cliente}
              onChange={(evento) => elegirFecha(evento.target.value)}
            >
              <option value="">Todas las fechas</option>
              {fechas.map((fecha) => (
                <option key={claveFecha(fecha)} value={claveFecha(fecha)}>
                  {etiquetaFecha(fecha)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {cliente ? (
          <div className="panel mt-4">
            <header className="panel-encabezado">
              <h2 className="text-sm font-semibold tracking-tight">
                Renglones de venta
              </h2>
              <span className="text-xs texto-suave">
                {seleccionados.length} de {disponibles.length} tildados
              </span>
            </header>

            {disponibles.length === 0 ? (
              <p className="px-4 py-6 text-sm texto-suave">
                {fechaElegida === ''
                  ? 'Este cliente no tiene renglones de venta cargados.'
                  : 'Este cliente no tiene renglones cargados con esa fecha.'}
              </p>
            ) : (
              <div className="tabla-scroll">
                <table className="tabla">
                <thead>
                  <tr>
                    <th className="w-10">
                      <span className="sr-only">Tildar</span>
                    </th>
                    <th className="w-28">Fecha</th>
                    <th>Código</th>
                    <th className="tabla-num w-24">Metros</th>
                    <th className="tabla-num w-36">Precio unitario</th>
                    <th className="w-28">Moneda</th>
                    <th className="tabla-num w-40">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {disponibles.map((renglon) => {
                    const tildado = tildados.includes(renglon.id);
                    return (
                      <tr key={renglon.id}>
                        <td>
                          <input
                            type="checkbox"
                            className="accent-acento"
                            checked={tildado}
                            onChange={() => alternar(renglon.id)}
                            aria-label={`Incluir el renglón ${renglon.codigo ?? 'sin artículo'}`}
                          />
                        </td>
                        <td>
                          <Fecha fecha={renglon.fecha} />
                        </td>
                        <td>
                          <span className="font-medium">
                            {renglon.codigo ?? <Ausente>Sin artículo</Ausente>}
                          </span>
                          {renglon.observaciones ? (
                            <span className="mt-0.5 block max-w-2xl text-xs texto-suave">
                              {renglon.observaciones}
                            </span>
                          ) : null}
                        </td>
                        <td className="tabla-num">
                          <Monto monto={renglon.metros} marca="Sin metros" />
                        </td>
                        <td className="tabla-num">
                          <Monto
                            monto={renglon.precioUnitario}
                            marca="Sin precio"
                          />
                        </td>
                        <td>
                          <Moneda moneda={renglon.moneda} />
                        </td>
                        <td className="tabla-num">
                          <Monto monto={renglon.total} marca="Sin total" />
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {/* Hay renglones tildados pero falta la empresa: se dice qué falta en
            vez de dejar la pantalla sin documento y sin explicación. */}
        {seleccionados.length > 0 && !empresa ? (
          <p className="panel mt-8 px-4 py-3 text-sm" role="status">
            Elegí la empresa emisora para armar la proforma.
          </p>
        ) : null}
      </section>

      {documento && empresa ? (
        <section className="mt-8">
          <div className="no-imprimir mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              {documentos.length > 1 ? (
                <>
                  <p className="text-sm">
                    Los renglones tildados tienen {documentos.length} monedas
                    distintas, así que sale un documento por cada una.
                  </p>
                  {/* Con poco ancho las solapas envuelven; cada una lleva su
                      borde para que se lea como algo que se puede tocar. */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {documentos.map((otro, indice) => (
                      <button
                        key={otro.clave}
                        type="button"
                        onClick={() => setIndiceActivo(indice)}
                        aria-current={indice === activo ? 'true' : undefined}
                        className={
                          indice === activo
                            ? 'rounded border border-acento bg-acento-suave px-3 py-1.5 text-sm font-medium text-acento'
                            : 'rounded border border-borde-fuerte bg-superficie px-3 py-1.5 text-sm text-texto-suave hover:bg-superficie-alt hover:text-texto'
                        }
                      >
                        {otro.moneda ?? 'Sin moneda'}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm texto-suave">
                  Un documento en {documento.moneda ?? 'sin moneda'}.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="boton-secundario"
                onClick={compartir}
                // La librería del PDF se adelanta al click: compartir tiene que
                // pasar dentro del gesto del usuario.
                onPointerDown={precargarPdf}
                onFocus={precargarPdf}
                disabled={generando}
              >
                {generando
                  ? 'Generando…'
                  : puedeCompartir
                    ? 'Compartir PDF'
                    : 'Descargar PDF'}
              </button>

              <button
                type="button"
                className="boton"
                onClick={() => window.print()}
              >
                Imprimir
              </button>
            </div>
          </div>

          {aviso ? (
            <p className="no-imprimir mb-4 text-sm texto-suave" role="status">
              {aviso}
            </p>
          ) : null}

          {errorPdf ? (
            <p className="mensaje-error no-imprimir mb-4" role="alert">
              {errorPdf}
            </p>
          ) : null}

          {/* El id lo lleva solo el documento visible: es lo único que se imprime
              y lo único que sale en el PDF. */}
          <div id="documento-proforma">
            <Documento
              key={documento.clave}
              documento={documento}
              cliente={cliente}
              empresa={empresa}
              campos={camposDelDocumento(
                documento.clave,
                documento.numeroSugerido,
              )}
              onCambiar={cambiarCampo}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
