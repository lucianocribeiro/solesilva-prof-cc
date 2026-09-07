'use server';

import { timingSafeEqual } from 'node:crypto';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { appPassword } from '@/lib/env';
import { COOKIE_SESION, crearToken, opcionesCookie } from '@/lib/session';

export type EstadoLogin = { error: string | null };

/** Comparación en tiempo constante, para no filtrar información por timing. */
function coincide(ingresada: string, esperada: string): boolean {
  const a = Buffer.from(ingresada);
  const b = Buffer.from(esperada);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function ingresar(
  _estadoPrevio: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const contrasena = formData.get('contrasena');

  if (typeof contrasena !== 'string' || !coincide(contrasena, appPassword())) {
    return { error: 'La contraseña no es correcta.' };
  }

  const almacen = await cookies();
  almacen.set(COOKIE_SESION, await crearToken(), opcionesCookie);

  redirect('/cuenta-corriente');
}

export async function salir(): Promise<void> {
  const almacen = await cookies();
  almacen.delete(COOKIE_SESION);

  redirect('/login');
}
