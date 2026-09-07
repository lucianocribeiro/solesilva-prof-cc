/**
 * Acceso a variables de entorno.
 *
 * Las variables se leen bajo demanda y nunca se exportan al cliente:
 * ninguna lleva el prefijo NEXT_PUBLIC_.
 */

/** Variables sin las que la app no puede arrancar. */
const REQUERIDAS = [
  'APP_PASSWORD',
  'SESSION_SECRET',
  'AIRTABLE_TOKEN',
  'AIRTABLE_BASE_ID',
] as const;

function leer(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(
      `Falta la variable de entorno ${nombre}. ` +
        'Copiá .env.local.example a .env.local y completala.',
    );
  }
  return valor;
}

export function appPassword(): string {
  return leer('APP_PASSWORD');
}

export function sessionSecret(): string {
  return leer('SESSION_SECRET');
}

export function airtableToken(): string {
  return leer('AIRTABLE_TOKEN');
}

export function airtableBaseId(): string {
  return leer('AIRTABLE_BASE_ID');
}

/**
 * Valida la configuración al arrancar el servidor.
 * Se llama desde src/instrumentation.ts.
 */
export function verificarEnv(): void {
  const faltantes = REQUERIDAS.filter((nombre) => !process.env[nombre]);
  if (faltantes.length > 0) {
    throw new Error(
      `Faltan variables de entorno: ${faltantes.join(', ')}. ` +
        'Copiá .env.local.example a .env.local y completalas.',
    );
  }
}
