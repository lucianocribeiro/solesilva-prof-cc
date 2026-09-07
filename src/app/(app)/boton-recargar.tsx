import { recargarDatos } from '@/lib/recargar';

export function BotonRecargar() {
  return (
    <form action={recargarDatos}>
      <button
        type="submit"
        className="boton-secundario"
        title="Vuelve a leer Airtable sin esperar al refresco automático"
      >
        Actualizar datos
      </button>
    </form>
  );
}
