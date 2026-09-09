'use client';

import { useState } from 'react';

import type { BloqueCliente as Bloque } from '@/lib/cuenta-corriente';
import { exportarCuentaCorriente } from '@/lib/exportar-excel';

import { BloqueCliente } from './bloque-cliente';

/** Sin acentos y en minúsculas, para que el buscador no dependa de la tilde. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Hay sección de moneda solo si esa moneda tiene saldo inicial o movimientos. */
function tieneActividad(bloque: Bloque): boolean {
  return bloque.secciones.length > 0;
}

function claveDe(bloque: Bloque): string {
  return bloque.cliente ?? '__sin_cliente__';
}

export function ListaClientes({ bloques }: { bloques: Bloque[] }) {
  const [busqueda, setBusqueda] = useState('');
  const [exportando, setExportando] = useState(false);
  const [errorExportar, setErrorExportar] = useState<string | null>(null);

  // El bloque de movimientos sin cliente no es un cliente: va siempre al final.
  const sinCliente = bloques.find((bloque) => bloque.cliente === null);
  const clientes = bloques.filter((bloque) => bloque.cliente !== null);

  const termino = normalizar(busqueda.trim());

  /**
   * Con el buscador vacío se muestran solo los clientes con actividad, porque
   * la base tiene cientos sin ningún movimiento. Pero la búsqueda corre sobre
   * el padrón entero: si filtrara lo visible, esos clientes serían
   * inalcanzables desde la app.
   */
  const visibles = termino
    ? clientes.filter((bloque) =>
        normalizar(bloque.cliente ?? '').includes(termino),
      )
    : clientes.filter(tieneActividad);

  const conActividad = clientes.filter(tieneActividad).length;

  /**
   * Buscar es filtrar: con texto en el buscador, los movimientos sin cliente
   * asignado no son parte del resultado y no se muestran. Con el buscador
   * vacío el bloque aparece, porque ahí se está viendo todo.
   */
  const sinClienteVisible = termino ? undefined : sinCliente;

  // Exactamente lo que se está viendo, en el mismo orden.
  const enPantalla = sinClienteVisible
    ? [...visibles, sinClienteVisible]
    : visibles;

  async function exportar() {
    setExportando(true);
    setErrorExportar(null);
    try {
      await exportarCuentaCorriente(enPantalla);
    } catch {
      setErrorExportar('No se pudo generar el archivo. Probá de nuevo.');
    } finally {
      setExportando(false);
    }
  }

  return (
    <div>
      <div className="panel mt-6 p-4">
        <div className="flex flex-wrap items-end gap-4 sm:gap-6">
          <div className="w-full sm:w-80">
            <label className="etiqueta" htmlFor="buscador">
              Buscar cliente
            </label>
            <input
              id="buscador"
              type="search"
              className="campo"
              placeholder="Escribí parte del nombre"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
            />
          </div>
          <p className="pb-2 text-sm texto-suave">
            {termino
              ? `${visibles.length} de ${clientes.length} clientes`
              : `${conActividad} clientes con saldo o movimientos, de ${clientes.length} en total`}
          </p>

          <button
            type="button"
            className="boton w-full sm:ml-auto sm:w-auto"
            onClick={exportar}
            disabled={exportando}
          >
            {exportando ? 'Generando…' : 'Exportar a Excel'}
          </button>
        </div>

        {errorExportar ? (
          <p className="mensaje-error mt-3">{errorExportar}</p>
        ) : null}

        <p className="mt-3 text-sm texto-suave">
          Se muestran los clientes con saldo inicial o movimientos. Buscá por
          nombre para ver cualquier otro. El Excel exporta exactamente lo que
          está en pantalla, siempre.
        </p>
      </div>

      {termino && visibles.length === 0 ? (
        <p className="panel mt-4 px-4 py-6 text-sm texto-suave">
          Ningún cliente coincide con “{busqueda.trim()}”.
        </p>
      ) : null}

      <div className="mt-6 space-y-8">
        {visibles.map((bloque) => (
          <BloqueCliente key={claveDe(bloque)} bloque={bloque} />
        ))}

        {sinClienteVisible ? (
          <BloqueCliente
            key={claveDe(sinClienteVisible)}
            bloque={sinClienteVisible}
          />
        ) : null}
      </div>
    </div>
  );
}
