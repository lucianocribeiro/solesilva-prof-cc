/**
 * Falla de lectura de Airtable. Se muestra el error, nunca una pantalla vacía
 * que parezca una base sin datos.
 */
export function ErrorDatos({ mensaje }: { mensaje: string }) {
  return (
    <div className="panel mt-6 p-5">
      <h2 className="text-sm font-semibold">No se pudieron leer los datos</h2>
      <p className="mensaje-error mt-3">{mensaje}</p>
      <p className="mt-3 text-sm texto-suave">
        No se muestra ningún dato porque no se pudo leer la base, no porque esté
        vacía. Probá con Actualizar datos; si sigue fallando, revisá la
        configuración de Airtable.
      </p>
    </div>
  );
}
