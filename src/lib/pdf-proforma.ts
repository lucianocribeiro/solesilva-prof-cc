/**
 * PDF de una proforma, dibujado en el navegador con jsPDF.
 *
 * Por qué dibujado y no capturado: el PDF tiene que tener texto de verdad
 * —seleccionable, buscable, copiable— y pesar poco. Una captura de pantalla
 * convertida a imagen no cumple ninguna de las dos cosas. Y por qué en el
 * cliente y no en el servidor: arrastrar un Chromium a Vercel para maquetar una
 * tabla, un bloque de totales y dos párrafos no se paga, y además obligaría a
 * mandar los datos de la proforma a algún lado. Acá no sale nada del navegador.
 *
 * Se usa Helvetica, una de las catorce fuentes estándar del formato: no hay que
 * embeber ninguna tipografía. Su codificación WinAnsi cubre todo el español,
 * acentos y eñes incluidos. Lo único embebido es el logo, que suma unos 4 kB, y
 * el archivo queda en el orden de los diez kB.
 *
 * El documento es un espejo del que se ve en pantalla: mismos textos, mismas
 * marcas de campo ausente, mismos formatos de monto y de fecha. Acá no se
 * calcula nada nuevo ni se completa nada que falte.
 */

import { LOGO, renglonesEmisor, type Empresa } from '@/lib/empresas';
import { formatearFecha, formatearMonto } from '@/lib/formato';
import type { CamposDocumento, DocumentoProforma } from '@/lib/proformas';

type JsPDF = InstanceType<typeof import('jspdf').jsPDF>;

/**
 * La librería se carga a pedido, igual que `xlsx` en la exportación de cuenta
 * corriente: solo hace falta cuando se genera un PDF.
 */
let modulo: Promise<typeof import('jspdf')> | null = null;

function cargarJsPDF(): Promise<typeof import('jspdf')> {
  modulo ??= import('jspdf');
  return modulo;
}

/**
 * El logo se lee del mismo archivo público que muestra la pantalla, así hay
 * uno solo. La promesa se guarda para no pedirlo en cada PDF; si la lectura
 * falla se descarta, y el próximo intento lo vuelve a pedir.
 */
let logo: Promise<Uint8Array> | null = null;

function cargarLogo(): Promise<Uint8Array> {
  logo ??= fetch(LOGO)
    .then((respuesta) => {
      if (!respuesta.ok) {
        throw new Error(`No se pudo leer el logo (${respuesta.status}).`);
      }
      return respuesta.arrayBuffer();
    })
    .then((bytes) => new Uint8Array(bytes))
    .catch((error: unknown) => {
      logo = null;
      throw error;
    });
  return logo;
}

/**
 * Adelanta la carga de la librería y del logo.
 *
 * Compartir tiene que ocurrir dentro del gesto del usuario: si al apretar el
 * botón hubiera que bajar la librería, algunos navegadores considerarían que el
 * gesto ya venció y no abrirían el menú de compartir. Se llama al apuntar el
 * botón, antes del click.
 */
export function precargarPdf(): void {
  void cargarJsPDF();
  // Si falla acá no se avisa: el error se muestra al generar, que lo reintenta.
  cargarLogo().catch(() => {});
}

/* --- Unidades -----------------------------------------------------------
   El documento se mide en milímetros, que es como se piensa una hoja A4. Los
   valores de la pantalla están en píxeles CSS, así que se convierten una sola
   vez acá y el resto del archivo habla en milímetros.
------------------------------------------------------------------------ */

const MM_POR_PX = 25.4 / 96;
const MM_POR_PT = 25.4 / 72;

/** Píxeles CSS a milímetros. */
function aMm(pixeles: number): number {
  return pixeles * MM_POR_PX;
}

/** Píxeles CSS a puntos: jsPDF mide la tipografía en puntos. */
function aPt(pixeles: number): number {
  return pixeles * 0.75;
}

/* --- Geometría de la hoja ------------------------------------------------
   Los mismos 18 mm de margen que declara `@page` en la hoja de estilos, para
   que el PDF y la impresión tengan la caja de texto idéntica.
------------------------------------------------------------------------ */

const ANCHO_HOJA = 210;
const ALTO_HOJA = 297;
const MARGEN = 18;

const IZQUIERDA = MARGEN;
const DERECHA = ANCHO_HOJA - MARGEN;
const ANCHO = DERECHA - IZQUIERDA;
const LIMITE_INFERIOR = ALTO_HOJA - MARGEN;

/** Las mismas proporciones que el colgroup de la tabla en pantalla. */
const FRACCIONES_COLUMNA = [0.24, 0.24, 0.14, 0.19, 0.19];

/** Bordes de las cinco columnas: seis valores, del izquierdo al derecho. */
const COLUMNAS = FRACCIONES_COLUMNA.reduce<number[]>(
  (bordes, fraccion) => [...bordes, bordes[bordes.length - 1] + fraccion * ANCHO],
  [IZQUIERDA],
);

/** El mismo aire entre columnas que el `pl-6` de la tabla en pantalla. */
const SEPARACION = aMm(24);

/** Ancho útil de las dos columnas de texto: el resto lo ocupa la separación. */
const ANCHO_CODIGO = COLUMNAS[1] - COLUMNAS[0] - SEPARACION;
const ANCHO_DESCRIPCION = COLUMNAS[2] - COLUMNAS[1] - SEPARACION;

/** Ancho del bloque de totales: el w-80 de la pantalla. */
const ANCHO_TOTALES = aMm(320);

/**
 * Lo que le queda al lado izquierdo del encabezado: el ancho de la hoja menos
 * el w-56 de los datos de la derecha y el gap-12 que los separa.
 */
const ANCHO_EMISOR = ANCHO - aMm(224) - aMm(48);

/**
 * Alto del logo: el mismo h-10 de la pantalla. El ancho no se fija, sale de la
 * proporción del archivo, así el logo nunca se estira ni se aplasta.
 */
const ALTO_LOGO = aMm(40);

/**
 * Cuánto sube el logo por encima del margen, el mismo desplazamiento que en
 * pantalla. Sube solo el logo: el título, los datos de la empresa y la columna
 * de la derecha se dibujan donde se dibujaban antes.
 */
const SUBIDA_LOGO = aMm(15);

/* --- Tinta --------------------------------------------------------------- */

const TINTA = '#1b1b19';
const TINTA_SUAVE = '#6a6a64';
const LINEA_SUAVE = '#e0e0dc';
const LINEA_FUERTE = '#c9c9c3';

/** Un borde de 1 px de la pantalla, en milímetros. */
const GROSOR_LINEA = aMm(1);

/* --- Estilos de texto ----------------------------------------------------
   Cada uno es la traducción de una clase de la hoja de estilos. Helvetica no
   tiene peso intermedio, así que lo que en pantalla es `font-medium` se dibuja
   normal cuando es un rótulo y en negrita cuando lo que hace es destacar.
------------------------------------------------------------------------ */

type Estilo = {
  /** Cuerpo en puntos. */
  cuerpo: number;
  peso?: 'normal' | 'bold' | 'italic';
  color?: string;
  /** Separación entre letras en milímetros: el tracking de la pantalla. */
  espaciado?: number;
  /** Multiplicador de la altura de línea. */
  interlineado?: number;
};

const TITULO: Estilo = {
  cuerpo: aPt(12),
  peso: 'bold',
  espaciado: aMm(12 * 0.22),
  interlineado: 1,
};

const EMISOR_NOMBRE: Estilo = {
  cuerpo: aPt(13),
  peso: 'bold',
  interlineado: 1.625,
};

const EMISOR: Estilo = {
  cuerpo: aPt(12),
  color: TINTA_SUAVE,
  interlineado: 1.625,
};

const ROTULO: Estilo = {
  cuerpo: aPt(10),
  color: TINTA_SUAVE,
  espaciado: aMm(10 * 0.14),
};

const META_VALOR: Estilo = { cuerpo: aPt(14), peso: 'bold' };

const NOMBRE_CLIENTE: Estilo = { cuerpo: aPt(16), peso: 'bold' };

const CELDA: Estilo = { cuerpo: aPt(14) };

const CODIGO: Estilo = { cuerpo: aPt(14), peso: 'bold' };

const OBSERVACION_RENGLON: Estilo = {
  cuerpo: aPt(12),
  color: TINTA_SUAVE,
  interlineado: 1.375,
};

/** Marca de campo sin cargar: la misma cursiva gris que el componente Ausente. */
const AUSENTE: Estilo = { cuerpo: aPt(14), peso: 'italic', color: TINTA_SUAVE };

const TOTAL_ROTULO: Estilo = { cuerpo: aPt(14), color: TINTA_SUAVE };
const TOTAL_VALOR: Estilo = { cuerpo: aPt(14) };

const TOTAL_FINAL_ROTULO: Estilo = {
  cuerpo: aPt(11),
  peso: 'bold',
  espaciado: aMm(11 * 0.14),
};

const TOTAL_FINAL_VALOR: Estilo = { cuerpo: aPt(20), peso: 'bold' };
const TOTAL_FINAL_MONEDA: Estilo = { cuerpo: aPt(14), peso: 'bold' };

const TEXTO_PIE: Estilo = { cuerpo: aPt(14), interlineado: 1.625 };

/* --- Dibujo de texto -----------------------------------------------------
   Un renglón puede mezclar estilos: "1.234,50 USD" es texto normal, pero
   "Sin precio" va en cursiva gris. Por eso se dibuja por trozos y no de una.
------------------------------------------------------------------------ */

/** Un pedazo de renglón con su propio estilo. */
type Trozo = { texto: string; estilo: Estilo };

function aplicar(doc: JsPDF, estilo: Estilo): void {
  doc.setFont('helvetica', estilo.peso ?? 'normal');
  doc.setFontSize(estilo.cuerpo);
  doc.setTextColor(estilo.color ?? TINTA);
}

/**
 * Ancho de un texto con su estilo.
 *
 * El espaciado entre letras se suma a mano porque jsPDF no lo incluye al medir.
 * Se cuentan los huecos entre letras y no el que queda después de la última:
 * así un texto alineado a la derecha termina justo en el margen.
 */
function anchoDe(doc: JsPDF, texto: string, estilo: Estilo): number {
  aplicar(doc, estilo);
  const espaciado = estilo.espaciado ?? 0;
  const huecos = Math.max(texto.length - 1, 0);
  return doc.getTextWidth(texto) + espaciado * huecos;
}

function anchoDeCorrida(doc: JsPDF, trozos: Trozo[]): number {
  return trozos.reduce(
    (suma, trozo) => suma + anchoDe(doc, trozo.texto, trozo.estilo),
    0,
  );
}

/** Alto de un renglón de texto, en milímetros. */
function altoLinea(estilo: Estilo): number {
  return estilo.cuerpo * MM_POR_PT * (estilo.interlineado ?? 1.45);
}

/**
 * Distancia entre el borde superior del renglón y la línea de base.
 * jsPDF dibuja apoyando en la base; la pantalla apila cajas desde arriba.
 */
function baseDeLinea(estilo: Estilo): number {
  const eme = estilo.cuerpo * MM_POR_PT;
  const medioInterlineado = (altoLinea(estilo) - eme) / 2;
  return medioInterlineado + eme * 0.72;
}

/** Dibuja una corrida de trozos. `x` es el borde izquierdo o el derecho. */
function escribirCorrida(
  doc: JsPDF,
  trozos: Trozo[],
  x: number,
  base: number,
  alineacion: 'izquierda' | 'derecha' = 'izquierda',
): void {
  let cursor =
    alineacion === 'derecha' ? x - anchoDeCorrida(doc, trozos) : x;

  for (const trozo of trozos) {
    aplicar(doc, trozo.estilo);
    doc.text(trozo.texto, cursor, base, {
      charSpace: trozo.estilo.espaciado ?? 0,
    });
    cursor += anchoDe(doc, trozo.texto, trozo.estilo);
  }
}

function escribir(
  doc: JsPDF,
  texto: string,
  estilo: Estilo,
  x: number,
  base: number,
  alineacion: 'izquierda' | 'derecha' = 'izquierda',
): void {
  escribirCorrida(doc, [{ texto, estilo }], x, base, alineacion);
}

/** Corta un texto en renglones que entren en el ancho dado. Respeta los saltos. */
function partir(
  doc: JsPDF,
  texto: string,
  ancho: number,
  estilo: Estilo,
): string[] {
  aplicar(doc, estilo);
  return doc.splitTextToSize(texto, ancho) as string[];
}

/* --- Contenido de las celdas --------------------------------------------
   Mismas marcas que en pantalla: un campo que no está se dice que no está, no
   se muestra un cero.
------------------------------------------------------------------------ */

function trozosDeMoneda(moneda: string | null): Trozo[] {
  return moneda === null
    ? [{ texto: 'Sin moneda', estilo: AUSENTE }]
    : [{ texto: moneda, estilo: CELDA }];
}

/** Un monto sin moneda al lado no dice nada: van siempre juntos. */
function trozosDeMonto(
  monto: number | null,
  marca: string,
  moneda: string | null,
): Trozo[] {
  if (monto === null) return [{ texto: marca, estilo: AUSENTE }];
  return [
    { texto: formatearMonto(monto), estilo: CELDA },
    { texto: ' ', estilo: CELDA },
    ...trozosDeMoneda(moneda),
  ];
}

/* --- Armado del documento ------------------------------------------------ */

export type DatosPdf = {
  documento: DocumentoProforma;
  cliente: string;
  campos: CamposDocumento;
  /** Fecha de emisión en ISO, la misma que muestra la pantalla. */
  fecha: string;
  /** La empresa elegida en pantalla. Sin empresa no hay documento. */
  empresa: Empresa;
};

function dibujar(doc: JsPDF, datos: DatosPdf, imagenLogo: Uint8Array): void {
  const { documento, cliente, campos, fecha, empresa } = datos;

  let y = MARGEN;

  const nuevaPagina = (): void => {
    doc.addPage();
    y = MARGEN;
  };

  const entra = (alto: number): boolean => y + alto <= LIMITE_INFERIOR;

  const regla = (color: string, desde = IZQUIERDA, hasta = DERECHA): void => {
    doc.setDrawColor(color);
    doc.setLineWidth(GROSOR_LINEA);
    doc.line(desde, y, hasta, y);
  };

  /* --- Encabezado ------------------------------------------------------- */

  let yIzquierda = y;

  const { width, height } = doc.getImageProperties(imagenLogo);
  // Compresión máxima: con este logo es la opción que menos pesa.
  doc.addImage(
    imagenLogo,
    'PNG',
    IZQUIERDA,
    yIzquierda - SUBIDA_LOGO,
    ALTO_LOGO * (width / height),
    ALTO_LOGO,
    'logo',
    'SLOW',
  );
  // El avance no descuenta la subida: lo que sigue queda donde estaba.
  yIzquierda += ALTO_LOGO + aMm(20);

  escribir(doc, 'PROFORMA', TITULO, IZQUIERDA, yIzquierda + baseDeLinea(TITULO));
  yIzquierda += altoLinea(TITULO) + aMm(16);

  renglonesEmisor(empresa).forEach((texto, indice) => {
    const estilo = indice === 0 ? EMISOR_NOMBRE : EMISOR;
    for (const linea of partir(doc, texto, ANCHO_EMISOR, estilo)) {
      escribir(doc, linea, estilo, IZQUIERDA, yIzquierda + baseDeLinea(estilo));
      yIzquierda += altoLinea(estilo);
    }
  });

  const meta: [string, Trozo[]][] = [
    ['N.º DE PROFORMA', [{ texto: campos.numero, estilo: META_VALOR }]],
    ['FECHA DE EMISIÓN', [{ texto: formatearFecha(fecha), estilo: META_VALOR }]],
    [
      'MONEDA',
      documento.moneda === null
        ? [{ texto: 'Sin moneda', estilo: { ...AUSENTE, peso: 'italic' } }]
        : [{ texto: documento.moneda, estilo: META_VALOR }],
    ],
  ];

  let yDerecha = y;
  meta.forEach(([rotulo, valor], indice) => {
    if (indice > 0) yDerecha += aMm(16);
    escribir(doc, rotulo, ROTULO, DERECHA, yDerecha + baseDeLinea(ROTULO), 'derecha');
    yDerecha += altoLinea(ROTULO) + aMm(6);
    escribirCorrida(doc, valor, DERECHA, yDerecha + baseDeLinea(META_VALOR), 'derecha');
    yDerecha += altoLinea(META_VALOR);
  });

  y = Math.max(yIzquierda, yDerecha) + aMm(28);
  regla(LINEA_FUERTE);
  y += aMm(28);

  /* --- Cliente ---------------------------------------------------------- */

  escribir(doc, 'CLIENTE', ROTULO, IZQUIERDA, y + baseDeLinea(ROTULO));
  y += altoLinea(ROTULO) + aMm(6);
  for (const linea of partir(doc, cliente, ANCHO, NOMBRE_CLIENTE)) {
    escribir(doc, linea, NOMBRE_CLIENTE, IZQUIERDA, y + baseDeLinea(NOMBRE_CLIENTE));
    y += altoLinea(NOMBRE_CLIENTE);
  }

  /* --- Detalle ---------------------------------------------------------- */

  y += aMm(36);

  const cabecerasNumericas = ['METROS', 'PRECIO UNITARIO', 'TOTAL'];

  const dibujarCabecera = (): void => {
    escribir(doc, 'CÓDIGO', ROTULO, COLUMNAS[0], y + baseDeLinea(ROTULO));
    escribir(doc, 'DESCRIPCIÓN', ROTULO, COLUMNAS[1], y + baseDeLinea(ROTULO));
    cabecerasNumericas.forEach((cabecera, indice) => {
      escribir(
        doc,
        cabecera,
        ROTULO,
        COLUMNAS[indice + 3],
        y + baseDeLinea(ROTULO),
        'derecha',
      );
    });
    y += altoLinea(ROTULO) + aMm(8);
    regla(LINEA_FUERTE);
  };

  dibujarCabecera();

  for (const renglon of documento.renglones) {
    const estiloCodigo = renglon.codigo === null ? AUSENTE : CODIGO;
    const lineasCodigo = partir(
      doc,
      renglon.codigo ?? 'Sin artículo',
      ANCHO_CODIGO,
      estiloCodigo,
    );
    const lineasObservacion = renglon.observaciones
      ? partir(doc, renglon.observaciones, ANCHO_CODIGO, OBSERVACION_RENGLON)
      : [];

    // La descripción va vacía mientras el dato no esté cargado en la base: es
    // una proforma que ve el cliente y acá no se inventa ningún texto.
    const lineasDescripcion = renglon.descripcion
      ? partir(doc, renglon.descripcion, ANCHO_DESCRIPCION, CELDA)
      : [];

    const altoTextoCodigo =
      lineasCodigo.length * altoLinea(estiloCodigo) +
      (lineasObservacion.length > 0
        ? aMm(6) + lineasObservacion.length * altoLinea(OBSERVACION_RENGLON)
        : 0);

    const altoTextoDescripcion = lineasDescripcion.length * altoLinea(CELDA);

    const altoFila =
      aMm(12) +
      Math.max(altoTextoCodigo, altoTextoDescripcion, altoLinea(CELDA)) +
      aMm(12);

    // Una fila no se parte entre dos hojas: si no entra entera, pasa a la
    // siguiente y la cabecera de la tabla se repite arriba.
    if (!entra(altoFila)) {
      nuevaPagina();
      dibujarCabecera();
    }

    let yTexto = y + aMm(12);

    for (const linea of lineasCodigo) {
      escribir(doc, linea, estiloCodigo, COLUMNAS[0], yTexto + baseDeLinea(estiloCodigo));
      yTexto += altoLinea(estiloCodigo);
    }

    if (lineasObservacion.length > 0) {
      yTexto += aMm(6);
      for (const linea of lineasObservacion) {
        escribir(
          doc,
          linea,
          OBSERVACION_RENGLON,
          COLUMNAS[0],
          yTexto + baseDeLinea(OBSERVACION_RENGLON),
        );
        yTexto += altoLinea(OBSERVACION_RENGLON);
      }
    }

    let yDescripcion = y + aMm(12);
    for (const linea of lineasDescripcion) {
      escribir(doc, linea, CELDA, COLUMNAS[1], yDescripcion + baseDeLinea(CELDA));
      yDescripcion += altoLinea(CELDA);
    }

    const baseNumeros = y + aMm(12) + baseDeLinea(CELDA);
    const columnasNumericas: Trozo[][] = [
      renglon.metros === null
        ? [{ texto: 'Sin metros', estilo: AUSENTE }]
        : [{ texto: formatearMonto(renglon.metros), estilo: CELDA }],
      trozosDeMonto(renglon.precioUnitario, 'Sin precio', documento.moneda),
      trozosDeMonto(renglon.total, 'Sin total', documento.moneda),
    ];

    columnasNumericas.forEach((trozos, indice) => {
      escribirCorrida(doc, trozos, COLUMNAS[indice + 3], baseNumeros, 'derecha');
    });

    y += altoFila;
    regla(LINEA_SUAVE);
  }

  /* --- Totales ----------------------------------------------------------
     El bloque entero pasa a la hoja siguiente antes que partirse.
  --------------------------------------------------------------------- */

  const izquierdaTotales = DERECHA - ANCHO_TOTALES;

  const altoTotales =
    2 * (aMm(12) + altoLinea(TOTAL_VALOR)) +
    aMm(10) +
    aMm(14) +
    altoLinea(TOTAL_FINAL_VALOR);

  y += aMm(32);
  if (!entra(altoTotales)) nuevaPagina();

  const filasDeTotal: [string, string][] = [
    ['Metros', formatearMonto(documento.totalMetros)],
    ['Renglones', String(documento.cantidadRenglones)],
  ];

  for (const [rotulo, valor] of filasDeTotal) {
    y += aMm(6);
    escribir(doc, rotulo, TOTAL_ROTULO, izquierdaTotales, y + baseDeLinea(TOTAL_VALOR));
    escribir(doc, valor, TOTAL_VALOR, DERECHA, y + baseDeLinea(TOTAL_VALOR), 'derecha');
    y += altoLinea(TOTAL_VALOR) + aMm(6);
  }

  y += aMm(10);
  regla(LINEA_FUERTE, izquierdaTotales, DERECHA);
  y += aMm(14);

  escribir(
    doc,
    'TOTAL',
    TOTAL_FINAL_ROTULO,
    izquierdaTotales,
    y + baseDeLinea(TOTAL_FINAL_VALOR),
  );
  escribirCorrida(
    doc,
    [
      { texto: formatearMonto(documento.total), estilo: TOTAL_FINAL_VALOR },
      { texto: ' ', estilo: TOTAL_FINAL_MONEDA },
      ...(documento.moneda === null
        ? [{ texto: 'Sin moneda', estilo: { ...AUSENTE, peso: 'italic' } as Estilo }]
        : [{ texto: documento.moneda, estilo: TOTAL_FINAL_MONEDA }]),
    ],
    DERECHA,
    y + baseDeLinea(TOTAL_FINAL_VALOR),
    'derecha',
  );
  y += altoLinea(TOTAL_FINAL_VALOR);

  /* --- Pie ---------------------------------------------------------------
     Observaciones y condiciones, tal como los escribió el usuario. Se dibujan
     las dos columnas renglón por renglón y a la par: por largo que sea el
     texto, sigue en la hoja siguiente y no se corta nunca.
  --------------------------------------------------------------------- */

  const anchoColumnaPie = (ANCHO - aMm(40)) / 2;
  const derechaPie = IZQUIERDA + anchoColumnaPie + aMm(40);

  const lineasObservaciones = campos.observaciones
    ? partir(doc, campos.observaciones, anchoColumnaPie, TEXTO_PIE)
    : [];
  const lineasCondiciones = campos.condiciones
    ? partir(doc, campos.condiciones, anchoColumnaPie, TEXTO_PIE)
    : [];

  y += aMm(56);

  // El primer renglón de texto tiene que entrar junto con los rótulos; si no,
  // el pie arranca en una hoja nueva y ahí la raya de arriba sobra.
  const altoMinimoPie =
    aMm(32) + altoLinea(ROTULO) + aMm(6) + altoLinea(TEXTO_PIE);

  if (entra(altoMinimoPie)) {
    regla(LINEA_SUAVE);
    y += aMm(32);
  } else {
    nuevaPagina();
  }

  escribir(doc, 'OBSERVACIONES', ROTULO, IZQUIERDA, y + baseDeLinea(ROTULO));
  escribir(doc, 'CONDICIONES Y VALIDEZ', ROTULO, derechaPie, y + baseDeLinea(ROTULO));
  y += altoLinea(ROTULO) + aMm(6);

  const renglonesDelPie = Math.max(
    lineasObservaciones.length,
    lineasCondiciones.length,
  );

  for (let indice = 0; indice < renglonesDelPie; indice += 1) {
    if (!entra(altoLinea(TEXTO_PIE))) nuevaPagina();

    const base = y + baseDeLinea(TEXTO_PIE);
    if (indice < lineasObservaciones.length) {
      escribir(doc, lineasObservaciones[indice], TEXTO_PIE, IZQUIERDA, base);
    }
    if (indice < lineasCondiciones.length) {
      escribir(doc, lineasCondiciones[indice], TEXTO_PIE, derechaPie, base);
    }
    y += altoLinea(TEXTO_PIE);
  }
}

/* --- Nombre del archivo -------------------------------------------------- */

/** Deja solo lo que se puede escribir en un nombre de archivo en cualquier sistema. */
function parteDeNombre(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60);
}

/**
 * El nombre identifica la proforma: empresa, número y cliente. La empresa va
 * primero para que dos proformas iguales de empresas distintas no se confundan.
 */
export function nombreDeArchivo(
  empresa: Empresa,
  numero: string,
  cliente: string,
): string {
  const partes = [
    'proforma',
    parteDeNombre(empresa.clave),
    parteDeNombre(numero),
    parteDeNombre(cliente),
  ];
  return `${partes.filter((parte) => parte !== '').join('-')}.pdf`;
}

/* --- Punto de entrada ---------------------------------------------------- */

/**
 * Arma el PDF de un documento y lo devuelve como archivo, listo para compartir
 * o para descargar. No lo guarda en ningún lado ni lo manda a ninguna parte.
 */
export async function generarPdfProforma(datos: DatosPdf): Promise<File> {
  const [{ jsPDF }, imagenLogo] = await Promise.all([
    cargarJsPDF(),
    cargarLogo(),
  ]);

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

  const nombre = nombreDeArchivo(datos.empresa, datos.campos.numero, datos.cliente);

  doc.setProperties({
    title: `Proforma ${datos.campos.numero} — ${datos.cliente}`.trim(),
    subject: datos.cliente,
    author: datos.empresa.razonSocial,
  });

  dibujar(doc, datos, imagenLogo);

  return new File([doc.output('blob')], nombre, { type: 'application/pdf' });
}
