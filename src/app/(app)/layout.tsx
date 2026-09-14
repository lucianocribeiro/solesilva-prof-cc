import Image from 'next/image';
import { LOGO } from '@/lib/empresas';
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
        {/* Tres columnas con los enlaces al centro: las laterales miden lo
            mismo, así quedan centrados aunque el logo y los botones no
            ocupen igual. En un teléfono no entra todo en una línea y los
            enlaces bajan a una segunda fila. */}
        <div
          className="contenedor grid min-h-12 grid-cols-2 items-center
            gap-x-6 gap-y-2 py-2 sm:grid-cols-[1fr_auto_1fr]"
        >
          <Image
            src={LOGO}
            alt="Sole Silva"
            width={178}
            height={53}
            className="h-[1.95rem] w-auto justify-self-start"
            unoptimized
            priority
          />

          <div
            className="order-last col-span-2 flex flex-wrap items-center
              justify-center gap-1 sm:order-none sm:col-span-1"
          >
            <Navegacion />

            <span className="mx-1 h-4 w-px bg-borde" aria-hidden="true" />

            <EnlaceAirtable />
          </div>

          <div className="flex items-center justify-self-end gap-2">
            <BotonRecargar />
            <BotonSalir />
          </div>
        </div>
      </header>

      <main className="contenedor py-6">{children}</main>
    </div>
  );
}
