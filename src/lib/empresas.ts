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
};

export const EMPRESAS: Empresa[] = [
  {
    clave: 'argentina',
    etiqueta: 'Argentina',
    razonSocial: 'María Soledad Silva',
    identificacion: { rotulo: 'CUIT', numero: '27-30077604-9' },
    domicilio: 'Juan Segundo Fernández 930, San Isidro, Buenos Aires',
  },
  {
    clave: 'eeuu',
    etiqueta: 'Estados Unidos',
    razonSocial: 'SOLE SILVA TEXTILES LLC',
    identificacion: { rotulo: 'EIN', numero: '88-0742687' },
    domicilio: '1801 NE 123rd Street, Suite 307, North Miami, FL',
  },
];

/** Las dos empresas llevan el mismo logo: el archivo de `public/`. */
export const LOGO = '/solesilva.png';

export function empresaPorClave(clave: string): Empresa | null {
  return EMPRESAS.find((empresa) => empresa.clave === clave) ?? null;
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
