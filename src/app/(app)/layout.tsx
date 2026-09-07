import { Navegacion } from './navegacion';
import { BotonRecargar } from './boton-recargar';
import { BotonSalir } from './boton-salir';
import { EnlaceAirtable } from './enlace-airtable';

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen">
      <header className="no-imprimir border-b border-borde bg-superficie">
        {/* Envuelve en pantallas angostas: en un teléfono no entra todo en una línea. */}
        <div
          className="contenedor flex min-h-12 flex-wrap items-center
            justify-between gap-x-6 gap-y-2 py-2"
        >
          <span className="text-sm font-semibold tracking-tight">
            Sole Silva — Administración
          </span>

          <div className="mr-auto flex flex-wrap items-center gap-1">
            <Navegacion />

            <span className="mx-1 h-4 w-px bg-borde" aria-hidden="true" />

            <EnlaceAirtable />
          </div>

          <div className="flex items-center gap-2">
            <BotonRecargar />
            <BotonSalir />
          </div>
        </div>
      </header>

      <main className="contenedor py-6">{children}</main>
    </div>
  );
}
