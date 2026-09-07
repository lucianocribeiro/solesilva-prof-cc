import { sessionSecret } from '@/lib/env';

export const COOKIE_SESION = 'sesion';

/** Duración de la sesión: 7 días. */
const DURACION_SEGUNDOS = 60 * 60 * 24 * 7;

/**
 * Token de sesión: "<vencimiento>.<firma>", donde el vencimiento es un
 * timestamp en milisegundos y la firma es un HMAC-SHA256 de ese vencimiento
 * hecho con SESSION_SECRET.
 *
 * Se usa Web Crypto (y no node:crypto) porque el middleware, que valida la
 * cookie en cada request, corre en el runtime Edge.
 */

const encoder = new TextEncoder();

function clave(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(sessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function aBase64Url(firma: ArrayBuffer): string {
  const bytes = new Uint8Array(firma);
  let binario = '';
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function desdeBase64Url(texto: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binario = atob(texto.replaceAll('-', '+').replaceAll('_', '/'));
    const bytes = new Uint8Array(new ArrayBuffer(binario.length));
    for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

export async function crearToken(): Promise<string> {
  const vencimiento = String(Date.now() + DURACION_SEGUNDOS * 1000);
  const firma = await crypto.subtle.sign(
    'HMAC',
    await clave(),
    encoder.encode(vencimiento),
  );
  return `${vencimiento}.${aBase64Url(firma)}`;
}

export async function tokenEsValido(token: string | undefined): Promise<boolean> {
  if (!token) return false;

  const [vencimiento, firma] = token.split('.');
  if (!vencimiento || !firma) return false;

  const bytesFirma = desdeBase64Url(firma);
  if (!bytesFirma) return false;

  const firmaValida = await crypto.subtle.verify(
    'HMAC',
    await clave(),
    bytesFirma,
    encoder.encode(vencimiento),
  );
  if (!firmaValida) return false;

  const vence = Number(vencimiento);
  return Number.isFinite(vence) && vence > Date.now();
}

/** Opciones de la cookie de sesión, compartidas al crearla y al borrarla. */
export const opcionesCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: DURACION_SEGUNDOS,
} as const;
