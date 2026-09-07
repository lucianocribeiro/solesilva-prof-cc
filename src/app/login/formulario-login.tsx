'use client';

import { useActionState } from 'react';

import { ingresar, type EstadoLogin } from '@/lib/auth-actions';

const ESTADO_INICIAL: EstadoLogin = { error: null };

export function FormularioLogin() {
  const [estado, accion, pendiente] = useActionState(ingresar, ESTADO_INICIAL);

  return (
    <form action={accion} className="space-y-4">
      <div>
        <label htmlFor="contrasena" className="etiqueta">
          Contraseña
        </label>
        <input
          id="contrasena"
          name="contrasena"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          className="campo"
        />
      </div>

      {estado.error ? (
        <p className="mensaje-error" role="alert">
          {estado.error}
        </p>
      ) : null}

      <button type="submit" className="boton w-full" disabled={pendiente}>
        {pendiente ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  );
}
