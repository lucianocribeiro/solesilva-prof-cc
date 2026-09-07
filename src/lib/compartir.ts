/**
 * Compartir o descargar un archivo generado en el navegador.
 *
 * La función de compartir del sistema —la que abre el menú con WhatsApp,
 * Mail y lo demás— existe en los teléfonos y en algunos navegadores de
 * escritorio, pero no en todos. Acá se pregunta antes de prometer nada: la
 * pantalla dice "Compartir" solamente donde se puede compartir de verdad, y
 * donde no, dice "Descargar".
 *
 * El archivo nunca sale del navegador por otro camino: no se sube a ningún
 * servidor ni se manda a ningún servicio.
 */

export type ResultadoCompartir = 'compartido' | 'cancelado' | 'descargado';

/**
 * Si el navegador puede compartir archivos.
 *
 * Se prueba con un PDF mínimo: `canShare` mira el tipo de archivo, no lo que
 * dice adentro. Hay que llamarla desde el navegador y después del primer render:
 * en el servidor no existe `navigator`, y si el botón se rotulara distinto en
 * el HTML del servidor y en el del cliente, React marcaría la diferencia.
 */
export function sePuedeCompartirArchivos(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (typeof navigator.share !== 'function') return false;
  if (typeof navigator.canShare !== 'function') return false;

  try {
    const prueba = new File(['%PDF-'], 'prueba.pdf', { type: 'application/pdf' });
    return navigator.canShare({ files: [prueba] });
  } catch {
    return false;
  }
}

/** Cancelar el menú de compartir no es un error: el usuario cambió de idea. */
function esCancelacion(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function descargarArchivo(archivo: File): void {
  const url = URL.createObjectURL(archivo);

  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = archivo.name;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();

  // Liberar la URL en el mismo tick puede cortar la descarga antes de que el
  // navegador termine de leer el blob.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Abre el menú de compartir del sistema con el archivo adjunto. Donde no hay
 * menú —o donde el navegador dice que sí y después falla— el archivo se
 * descarga, que es lo único que queda por hacer.
 */
export async function compartirArchivo(
  archivo: File,
  texto: string,
): Promise<ResultadoCompartir> {
  const puede =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    navigator.canShare?.({ files: [archivo] }) === true;

  if (puede) {
    try {
      await navigator.share({ files: [archivo], text: texto, title: texto });
      return 'compartido';
    } catch (error) {
      if (esCancelacion(error)) return 'cancelado';
      // Dijo que podía y no pudo: queda la descarga.
    }
  }

  descargarArchivo(archivo);
  return 'descargado';
}
