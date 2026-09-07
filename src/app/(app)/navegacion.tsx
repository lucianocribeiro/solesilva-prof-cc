'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SECCIONES = [
  { href: '/cuenta-corriente', texto: 'Cuenta corriente' },
  { href: '/proformas', texto: 'Proformas' },
];

export function Navegacion() {
  const ruta = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {SECCIONES.map((seccion) => {
        const activa = ruta === seccion.href;

        return (
          <Link
            key={seccion.href}
            href={seccion.href}
            aria-current={activa ? 'page' : undefined}
            className={
              activa
                ? 'rounded bg-acento-suave px-2.5 py-1 text-sm font-medium text-acento'
                : 'rounded px-2.5 py-1 text-sm text-texto-suave hover:bg-superficie-alt hover:text-texto'
            }
          >
            {seccion.texto}
          </Link>
        );
      })}
    </nav>
  );
}
