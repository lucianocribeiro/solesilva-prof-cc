/**
 * Empresas desde las que se emite una proforma.
 *
 * Son datos fijos de la app: no vienen de Airtable ni se editan en pantalla.
 * Para cambiar un domicilio o una razón social se edita acá y en ningún otro
 * lado; el documento en pantalla, la impresión y el PDF leen de esta lista.
 *
 * Cada empresa lleva el rótulo fiscal de su país tal cual —CUIT la argentina,
 * EIN la estadounidense—: no hay un rótulo genérico que sirva para las dos.
 */

export type Empresa = {
  /** Identificador estable: valor del selector y parte del nombre del PDF. */
  clave: string;
  /** Cómo se la nombra en el selector de la pantalla. */
  etiqueta: string;
  razonSocial: string;
  identificacion: {
    rotulo: string;
    numero: string;
  };
  domicilio: string;
  /** Título del documento. La proforma estadounidense lo lleva en inglés. */
  titulo: string;
  /**
   * Qué campo de la tabla Artículos llena la columna de descripción:
   * "Descripción" (castellano) o "Description" (inglés).
   */
  idiomaDescripcion: 'es' | 'en';
};

export const EMPRESAS: Empresa[] = [
  {
    clave: 'argentina',
    etiqueta: 'Argentina',
    razonSocial: 'María Soledad Silva',
    identificacion: { rotulo: 'CUIT', numero: '27-30077604-9' },
    domicilio: 'Juan Segundo Fernández 930, San Isidro, Buenos Aires',
    titulo: 'Proforma',
    idiomaDescripcion: 'es',
  },
  {
    clave: 'eeuu',
    etiqueta: 'Estados Unidos',
    razonSocial: 'SOLE SILVA TEXTILES LLC',
    identificacion: { rotulo: 'EIN', numero: '88-0742687' },
    domicilio: '1801 NE 123rd Street, Suite 307, North Miami, FL',
    titulo: 'Proforma Invoice',
    idiomaDescripcion: 'en',
  },
];

/** Las dos empresas llevan el mismo logo: el archivo de `public/`. */
export const LOGO = '/solesilva.png';

export function empresaPorClave(clave: string): Empresa | null {
  return EMPRESAS.find((empresa) => empresa.clave === clave) ?? null;
}

/**
 * Descripción del renglón en el idioma de la empresa. Si el artículo no tiene
 * cargado ese campo, la celda va vacía: no se usa el del otro idioma.
 */
export function descripcionPara(
  empresa: Empresa,
  renglon: { descripcion: string | null; descripcionIngles: string | null },
): string | null {
  return empresa.idiomaDescripcion === 'en'
    ? renglon.descripcionIngles
    : renglon.descripcion;
}

/**
 * Los renglones que el documento muestra bajo el título, en orden: razón
 * social, identificación fiscal y domicilio. La pantalla y el PDF los toman de
 * acá para decir exactamente lo mismo.
 */
export function renglonesEmisor(empresa: Empresa): string[] {
  const { rotulo, numero } = empresa.identificacion;
  return [empresa.razonSocial, `${rotulo} ${numero}`, empresa.domicilio];
}
