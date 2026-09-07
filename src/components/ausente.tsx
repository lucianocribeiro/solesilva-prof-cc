/**
 * Marca de campo sin cargar. La app es un espejo de la base: cuando un dato no
 * está, se dice que no está, en vez de mostrar un cero o una celda vacía.
 */
export function Ausente({ children }: { children: React.ReactNode }) {
  return <span className="italic texto-suave">{children}</span>;
}
