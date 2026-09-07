import { urlDeLaBase } from '@/lib/airtable';

/** Flecha de salida: indica que el enlace lleva fuera de la app. */
function FlechaExterna() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 2.5h5v5" />
      <path d="M9.5 2.5 3 9" />
    </svg>
  );
}

export function EnlaceAirtable() {
  return (
    <a
      href={urlDeLaBase()}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-sm
        text-texto-suave hover:bg-superficie-alt hover:text-texto"
    >
      Airtable
      <FlechaExterna />
      <span className="sr-only">(se abre en una pestaña nueva)</span>
    </a>
  );
}
