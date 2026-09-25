/**
 * Foto del artículo para la proforma. Solo corre en el servidor.
 *
 * Las URLs de adjuntos de Airtable caducan, así que no se guardan ni se mandan
 * al navegador. El navegador conoce una sola dirección, la de la app
 * (`/proformas/foto/<id del artículo>`). Cada vez que se pide, el servidor lee
 * el artículo en ese momento, baja la miniatura y la devuelve ya achicada.
 *
 * Se parte de la miniatura `large` que arma Airtable, de hasta 768 px, y no del
 * original, que pesa entre 3,7 y 9,6 MB. Después se recorta al cuadrado desde
 * el centro y se recomprime como JPEG. Todos los renglones quedan con la misma
 * altura aunque haya fotos verticales y horizontales. El recorte no se nota en
 * una tela.
 */

import { leerRegistro, adjuntos, TABLAS } from '@/lib/airtable';
import { CAMPO_FOTO } from '@/lib/datos';
import { LADO_FOTO } from '@/lib/proformas';

/**
 * Lado del archivo que se entrega: tres veces el lado en pantalla, para que
 * se vea nítida en un teléfono de alta densidad y en papel. Eso da unos
 * 290 ppp a 14,8 mm.
 */
const LADO_ARCHIVO = LADO_FOTO * 3;

/** Calidad JPEG. Más arriba el archivo crece y en papel no se nota la diferencia. */
const CALIDAD = 70;

/** Ids de registro de Airtable: "rec" y catorce caracteres. */
const ID_DE_REGISTRO = /^rec[A-Za-z0-9]{14}$/;

export function urlDeFoto(idArticulo: string): string {
  return `/proformas/foto/${idArticulo}`;
}

/**
 * La foto de un artículo, lista para el documento. `null` si el artículo no
 * existe o no tiene foto: en ese caso la celda del documento va vacía.
 */
export async function fotoDeArticulo(idArticulo: string): Promise<Buffer | null> {
  if (!ID_DE_REGISTRO.test(idArticulo)) return null;

  const articulo = await leerRegistro(TABLAS.articulos, idArticulo);
  if (!articulo) return null;

  // Si hay varias fotos cargadas, va la primera, como la muestra Airtable.
  const [primera] = adjuntos(articulo, CAMPO_FOTO);
  const origen = primera?.thumbnails?.large?.url;
  if (!origen) return null;

  const respuesta = await fetch(origen, { cache: 'no-store' });
  if (!respuesta.ok) {
    throw new Error(`No se pudo bajar la foto (${respuesta.status}).`);
  }
  const original = Buffer.from(await respuesta.arrayBuffer());

  // sharp se carga recién acá: el resto del módulo lo importan pantallas que
  // no procesan ninguna imagen.
  const { default: sharp } = await import('sharp');

  return sharp(original)
    .rotate() // respeta la orientación que trae la cámara
    .resize(LADO_ARCHIVO, LADO_ARCHIVO, { fit: 'cover' })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: CALIDAD, mozjpeg: true })
    .toBuffer();
}
