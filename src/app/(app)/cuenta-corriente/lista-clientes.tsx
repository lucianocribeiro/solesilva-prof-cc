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

function tieneActividad(bloque: Bloque): boolean {
  return bloque.saldosIniciales.length > 0 || bloque.movimientos.length > 0;
}

function claveDe(bloque: Bloque): string {
  return bloque.cliente ?? '__sin_cliente__';
}

export function ListaClientes({ bloques }: { bloques: Bloque[] }) {
  const [busqueda, setBusqueda] = useState('');
  const [exportando, setExportando] = useState(false);
  const [errorExportar, setErrorExportar] = useState<string | null>(null);

  // El bloque de movimientos sin cliente no es un cliente: va siempre al final
  // y el buscador no lo afecta.
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

  // Exactamente lo que se está viendo, en el mismo orden.
  const enPantalla = sinCliente ? [...visibles, sinCliente] : visibles;

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
        <div className="flex flex-wrap items-end gap-6">
          <div className="w-80">
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
            className="boton ml-auto"
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
          nombre para ver cualquier otro. La exportación incluye lo que está en
          pantalla, siempre con los movimientos sin cliente asignado.
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

        {sinCliente ? (
          <BloqueCliente key={claveDe(sinCliente)} bloque={sinCliente} />
        ) : null}
      </div>
    </div>
  );
}
