import { fotoDeArticulo } from '@/lib/fotos';

/**
 * Foto de un artículo, ya achicada. La pide el documento en pantalla y la pide
 * el PDF. La ruta queda detrás del mismo control de sesión que el resto de la
 * app, porque el middleware cubre todo lo que no es un archivo estático.
 */

export const dynamic = 'force-dynamic';

/**
 * El navegador la guarda cinco minutos, el mismo plazo que el resto de los
 * datos. Así, si varios renglones son del mismo artículo, la pantalla y el PDF
 * la bajan una sola vez.
 */
const CACHE = 'private, max-age=300';

export async function GET(
  _pedido: Request,
  { params }: { params: Promise<{ articulo: string }> },
) {
  const { articulo } = await params;

  let foto: Buffer | null;
  try {
    foto = await fotoDeArticulo(articulo);
  } catch {
    // No se detalla nada: el error podría llevar una URL de Airtable.
    return new Response(null, { status: 502 });
  }

  if (!foto) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(foto), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': CACHE,
    },
  });
}
