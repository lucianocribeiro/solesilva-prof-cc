'use client';

import { useActionState } from 'react';

import { recargarDatos } from '@/lib/recargar';

/** Hora local de la última lectura, para que se note que el botón hizo algo. */
function hora(momento: number): string {
  return new Date(momento).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function BotonRecargar() {
  const [ultimaLectura, recargar, pendiente] = useActionState<number | null>(
    recargarDatos,
    null,
  );

  return (
    <form action={recargar} className="flex items-center gap-2">
      {ultimaLectura !== null && !pendiente ? (
        <span className="text-xs texto-suave" role="status">
          Actualizado {hora(ultimaLectura)}
        </span>
      ) : null}

      <button
        type="submit"
        className="boton-secundario"
        disabled={pendiente}
        title="Vuelve a leer Airtable sin esperar al refresco automático"
      >
        {pendiente ? 'Actualizando…' : 'Actualizar datos'}
      </button>
    </form>
  );
}
