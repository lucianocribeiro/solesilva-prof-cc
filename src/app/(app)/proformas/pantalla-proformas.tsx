'use client';

import { useState } from 'react';

import { Ausente } from '@/components/ausente';
import { Fecha } from '@/components/fecha';
import { Moneda } from '@/components/moneda';
import { Monto } from '@/components/monto';
import { formatearFecha } from '@/lib/formato';
import {
  armarDocumentos,
  clientesConVentas,
  fechasDeCliente,
  renglonesDe,
  TODAS_LAS_FECHAS,
  type FiltroFecha,
} from '@/lib/proformas';
import type { RenglonVenta } from '@/lib/renglones-venta';

import {
  CONDICIONES_POR_DEFECTO,
  Documento,
  type CamposDocumento,
} from './documento';

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
  const [cliente, setCliente] = useState('');
  const [fechaElegida, setFechaElegida] = useState('');
  const [tildados, setTildados] = useState<string[]>([]);
  const [indiceActivo, setIndiceActivo] = useState(0);
  const [campos, setCampos] = useState<Record<string, CamposDocumento>>({});

  const clientes = clientesConVentas(renglones);
  const fechas = cliente ? fechasDeCliente(renglones, cliente) : [];

  // El cliente es obligatorio; la fecha es un filtro opcional sobre sus renglones.
  const disponibles = cliente
    ? renglonesDe(renglones, cliente, filtroDesdeSelect(fechaElegida))
    : [];

  const seleccionados = disponibles.filter((renglon) =>
    tildados.includes(renglon.id),
  );
  const documentos = armarDocumentos(seleccionados);
  const activo = Math.min(indiceActivo, Math.max(documentos.length - 1, 0));
  const documento = documentos[activo];

  function elegirCliente(nuevo: string) {
    setCliente(nuevo);
    setFechaElegida('');
    setTildados([]);
    setIndiceActivo(0);
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
    const actuales = campos[documento.clave] ?? {
      numero: documento.numeroSugerido,
      observaciones: '',
      condiciones: CONDICIONES_POR_DEFECTO,
    };
    setCampos((previos) => ({
      ...previos,
      [documento.clave]: { ...actuales, [campo]: valor },
    }));
  }

  return (
    <div>
      <section className="no-imprimir">
        <h1 className="titulo-pagina">Proformas</h1>
        <p className="mt-1 text-sm texto-suave">
          Elegí un cliente y tildá los renglones que van en la proforma. La
          fecha es un filtro opcional: sin elegir ninguna se ven todos sus
          renglones. Si hay más de una moneda sale un documento por cada una.
        </p>

        <div className="panel mt-6 flex flex-wrap gap-6 p-4">
          <div className="w-72">
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

          <div className="w-56">
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
      </section>

      {documento ? (
        <section className="mt-8">
          <div className="no-imprimir mb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              {documentos.length > 1 ? (
                <>
                  <p className="text-sm">
                    Los renglones tildados tienen {documentos.length} monedas
                    distintas, así que sale un documento por cada una.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {documentos.map((otro, indice) => (
                      <button
                        key={otro.clave}
                        type="button"
                        onClick={() => setIndiceActivo(indice)}
                        aria-current={indice === activo ? 'true' : undefined}
                        className={
                          indice === activo
                            ? 'rounded bg-acento-suave px-2.5 py-1 text-sm font-medium text-acento'
                            : 'rounded px-2.5 py-1 text-sm text-texto-suave hover:bg-superficie-alt hover:text-texto'
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

            <button
              type="button"
              className="boton"
              onClick={() => window.print()}
            >
              Imprimir
            </button>
          </div>

          {/* El id lo lleva solo el documento visible: es lo único que se imprime. */}
          <div id="documento-proforma">
            <Documento
              key={documento.clave}
              documento={documento}
              cliente={cliente}
              campos={
                campos[documento.clave] ?? {
                  numero: documento.numeroSugerido,
                  observaciones: '',
                  condiciones: CONDICIONES_POR_DEFECTO,
                }
              }
              onCambiar={cambiarCampo}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
