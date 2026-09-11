# Sole Silva — Administración

Aplicación web interna con dos pantallas: **cuenta corriente** y **proformas**.

Los datos se leen de una base de Airtable de solo lectura. La cuenta corriente
se exporta a Excel y las proformas se imprimen o se mandan en PDF.

## Requisitos

- Node.js 20 o superior
- npm

## Cómo levantarlo en local

1. Instalá las dependencias:

   ```bash
   npm install
   ```

2. Copiá el archivo de ejemplo y completalo:

   ```bash
   cp .env.local.example .env.local
   ```

3. Completá las cuatro variables en `.env.local`:

   | Variable | Para qué sirve |
   | --- | --- |
   | `APP_PASSWORD` | La contraseña única con la que entra todo el equipo. |
   | `SESSION_SECRET` | Clave con la que se firma la cookie de sesión. |
   | `AIRTABLE_TOKEN` | Token de Airtable, de solo lectura, limitado a esta base. |
   | `AIRTABLE_BASE_ID` | Id de la base. Empieza con `app`. |

   Las cuatro son obligatorias: si falta alguna, el servidor no arranca y dice
   cuál falta. Ninguna lleva el prefijo `NEXT_PUBLIC_`, así que ninguna llega al
   navegador.

   Para generar el secreto de sesión:

   ```bash
   openssl rand -base64 32
   ```

### Cómo generar el token de Airtable

El token tiene que ser de **solo lectura** y estar limitado a esta base. La app
nunca escribe en Airtable.

1. Entrá a <https://airtable.com/create/tokens> y creá un personal access token.
2. En **Scopes**, agregá exactamente estos dos y ninguno más:
   - `data.records:read` — leer los registros de las tablas.
   - `schema.bases:read` — leer los nombres de tablas y campos.
3. En **Access**, elegí solamente la base de la app. No le des acceso al
   workspace entero ni a otras bases.
4. Copiá el token, que empieza con `pat`, y pegalo en `AIRTABLE_TOKEN`. Airtable
   lo muestra una sola vez.

El id de la base sale de la URL cuando la abrís:
`https://airtable.com/<AIRTABLE_BASE_ID>/...`

4. Levantá el servidor:

   ```bash
   npm run dev
   ```

   Abrí http://localhost:3000. Te va a redirigir a `/login`.

## Build de producción

```bash
npm run build
npm start
```

## Cómo funciona el acceso

- Hay una sola contraseña para todo el equipo. No hay usuarios ni roles.
- La contraseña se compara **solo en el servidor**, dentro de una Server Action.
  Nunca llega al navegador ni queda en el bundle del cliente.
- Si es correcta, se guarda una cookie `sesion` firmada con HMAC-SHA256 usando
  `SESSION_SECRET`. Es `httpOnly`, `sameSite=lax`, `secure` en producción y dura
  7 días.
- Un middleware valida la firma y el vencimiento de la cookie en cada request.
  Sin cookie válida, cualquier ruta redirige a `/login`.
- El botón **Salir** del encabezado borra la cookie y vuelve al login.

Si cambiás `SESSION_SECRET`, todas las sesiones abiertas dejan de valer.

## Datos

Los datos se leen de Airtable **desde el servidor**: el token nunca llega al
navegador. Se leen cuatro tablas —Clientes, Ventas, Cobranzas y Artículos— con
paginación completa, porque Airtable devuelve como máximo 100 registros por
página.

Las respuestas se cachean 5 minutos. El botón **Actualizar datos** del
encabezado fuerza la relectura sin esperar ese plazo.

La app es un espejo de la base: no valida, no corrige, no completa y no
convierte. Un campo vacío en Airtable se muestra con una marca (*Sin fecha*,
*Sin moneda*, *Sin precio*, *Sin metros*, *Sin artículo*), nunca como un cero.
Los subtotales los calcula la app desde los movimientos, separados por moneda;
los campos calculados de Airtable que consolidan todo a dólares no se usan.

El saldo inicial de la tabla Clientes es un número sin campo de moneda al lado,
así que se lee como dólares. Esa suposición vive en la constante
`MONEDA_SALDO_INICIAL` de `src/lib/datos.ts`, en un solo lugar.

La descripción del artículo sale del campo `Descripción` de la tabla Artículos,
resolviendo el vínculo de cada venta. Hoy está cargada en muy pocos artículos,
así que la columna sale en blanco casi siempre: eso es lo esperado y no se
rellena con el código ni con ningún otro texto.

El precio unitario sale de `Precio unitario (fijado)` de la tabla Ventas, que es
el precio congelado al registrar la venta. No se usan los precios de lista de la
tabla Artículos: esos son referencia y cambian cuando se actualiza una lista, así
que una proforma vieja mostraría un precio que nunca se cobró.

## Cuenta corriente

Dentro del bloque de cada cliente, **cada moneda es su propia cuenta
corriente**: su encabezado, su saldo inicial, sus movimientos y su subtotal. Un
movimiento aparece en una sola sección, la de su moneda, y nada se mezcla ni se
convierte. Las secciones van alfabéticas por código de moneda, con la de
movimientos sin moneda al final, y adentro de cada una los movimientos van por
fecha ascendente, con los que no tienen fecha al final.

El buscador filtra el padrón entero, no solo lo visible: con el buscador vacío
se muestran únicamente los clientes con saldo inicial o movimientos, porque la
base tiene cientos sin ninguno. El bloque de movimientos sin cliente asignado
aparece cuando el buscador está vacío y desaparece cuando tiene texto: buscar es
filtrar, y esos movimientos no son parte del resultado de una búsqueda.

## Exportación a Excel

El botón **Exportar a Excel** de la cuenta corriente genera el archivo en el
navegador, con los datos que la pantalla ya tiene: no se vuelve a leer Airtable.
La regla es una sola y no tiene excepciones: **el Excel exporta exactamente lo
que se ve en pantalla**. Si el buscador tiene texto, sale lo filtrado y nada
más; si está vacío, sale todo lo visible incluido el bloque de movimientos sin
cliente asignado.

El archivo tiene dos hojas, *Subtotales* (una fila por cliente y moneda) y
*Movimientos* (una fila por movimiento, ordenada por cliente, después por moneda
y después por fecha ascendente). Los montos van como números y las fechas como
fechas de Excel, para poder sumar, ordenar y filtrar. Un campo sin cargar queda
como celda vacía, no como cero.

Las columnas de la hoja de movimientos van en este orden, que lo pidió el
cliente: Cliente, Fecha, Tipo, Comprobante, Código de artículo, Metros,
Descripción del artículo, Precio unitario, Moneda, Monto.

El código, los metros, la descripción y el precio unitario son datos de la
venta: en las filas de cobranza esas cuatro celdas quedan vacías, porque una
cobranza no tiene ninguno.

Las fechas se escriben como número de serie de Excel y no como `Date`: un `Date`
se serializa como instante UTC y en cualquier zona detrás de Greenwich la celda
termina mostrando el día anterior.

Se usa SheetJS oficial, instalado desde el CDN de SheetJS y no desde npm,
porque el paquete `xlsx` de npm quedó viejo. La librería se carga a pedido, solo
al exportar. SheetJS Community Edition no escribe estilos de celda, así que los
encabezados van sin negrita y sin panel fijo: es cosmético y no cambia los
datos.

## Empresas emisoras

La proforma puede emitirse desde cualquiera de dos empresas: la argentina
(María Soledad Silva, con CUIT) o la estadounidense (SOLE SILVA TEXTILES LLC,
con EIN). El selector **Empresa emisora** está junto a los de cliente y fecha,
arranca vacío y **sin empresa elegida no se arma ningún documento**: es lo que
evita emitir con la empresa equivocada por descuido.

Los datos son fijos de la app y no vienen de Airtable: viven en
`src/lib/empresas.ts`, que es el único lugar donde hay que tocar para cambiar
una razón social, una identificación o un domicilio. Cada empresa lleva el
rótulo fiscal de su país —CUIT la argentina, EIN la estadounidense—; no hay un
rótulo genérico que sirva para las dos.

La empresa elegida **no afecta el corte por moneda**: si entre los renglones
tildados hay más de una moneda sigue saliendo un documento por cada una, y
todos llevan la misma empresa. El nombre del archivo PDF la incluye, así dos
proformas con el mismo número pero de empresas distintas no se confunden.

El encabezado del documento muestra, a la izquierda, el logo de
`public/solesilva.png`, el título y los datos de la empresa; a la derecha, el
número, la fecha de emisión y la moneda. Del logo se fija solo el alto, tanto
en pantalla como en el PDF: el ancho sale de la proporción del archivo, así que
cambiarlo por otro no lo deforma.

## PDF de la proforma

Junto al botón de imprimir hay uno que genera el PDF del documento visible: uno
solo, el de la moneda que está abierta, igual que la impresión. El archivo se
llama `proforma-<empresa>-<número>-<cliente>.pdf` e incluye lo que el usuario
escribió en observaciones y condiciones.

El PDF se **dibuja** en el navegador con jsPDF, no se captura de la pantalla. El
texto es texto de verdad —seleccionable, buscable y copiable— y una proforma
pesa alrededor de diez kB. Se usa Helvetica, una de las catorce fuentes
estándar del formato, así que no hay que embeber ninguna tipografía; su
codificación cubre todo el español.

Lo único embebido es el logo, que suma unos 3,8 kB: la misma proforma pasó de
4,8 a 8,6 kB al agregarlo. Se embebe con la compresión más fuerte de jsPDF, que
para este archivo es la que menos pesa —sin comprimir serían 28 kB—, y se lee
del mismo `/solesilva.png` que muestra la pantalla, en vez de llevar una copia
adentro del bundle. Se precarga junto con la librería al apuntar el botón,
porque compartir tiene que ocurrir dentro del gesto del usuario. Se descartó generar el PDF en el servidor
con un Chromium sin cabeza: son unos cincuenta MB en la función de Vercel y un
arranque en frío de segundos para maquetar una tabla, un bloque de totales y dos
párrafos. La librería se carga a pedido, igual que la de Excel.

El archivo no se guarda en ningún lado: no va al servidor, no va a Airtable y no
pasa por ningún servicio externo.

En el celular, el botón abre el menú de compartir del sistema con el PDF
adjunto, para elegir WhatsApp desde ahí. En escritorio ese menú tiene soporte
irregular, así que la app pregunta si existe: donde está, comparte; donde no, el
botón dice **Descargar PDF**, baja el archivo y avisa que hay que adjuntarlo a
mano. El rótulo nunca promete algo que el navegador no puede hacer. Cancelar el
menú de compartir no muestra ningún error.

## Pantallas angostas

El documento está maquetado para hoja A4 y en un teléfono la tabla de cinco
columnas no entra. En vez de dejarla scrollear de costado —que obliga a
arrastrar para leer un total— por debajo de 640 px cada renglón se reacomoda
como una ficha, con el código y la descripción arriba y los montos rotulados
debajo.

Todo eso vive en un bloque `@media screen and (max-width: 640px)` de
`globals.css`: no lo ve la impresora. En papel el documento sigue siendo la
misma hoja A4 con su tabla de cinco columnas.

## Estructura

```
src/
  app/
    (app)/                    layout protegido: encabezado, navegación y salir
      cuenta-corriente/       saldos por cliente, buscador y exportación
      proformas/              armado, impresión y PDF del documento
    login/                    pantalla de acceso
    globals.css               colores, tipografía y clases de tabla compartidas
    layout.tsx                layout raíz
    page.tsx                  "/" redirige a /cuenta-corriente
  components/                 marcas compartidas: fecha, moneda, monto ausente
  lib/
    airtable.ts               lectura de Airtable: paginación, cache y errores
    exportar-excel.ts         generación del archivo de Excel en el navegador
    pdf-proforma.ts           dibujo del PDF de la proforma en el navegador
    compartir.ts              menú de compartir del sistema, con descarga de respaldo
    datos.ts                  cuenta corriente: clientes, saldos y movimientos
    renglones-venta.ts        renglones de venta para proformas
    empresas.ts               datos fijos de las dos empresas emisoras
    auth-actions.ts           Server Actions de ingresar y salir
    env.ts                    lectura y validación de variables de entorno
    session.ts                firma y validación de la cookie de sesión
  instrumentation.ts          valida las variables al arrancar el servidor
  middleware.ts               protege todas las rutas
```

## Estilo

Los colores y las clases reutilizables están definidos en `src/app/globals.css`
(`@theme` para los tokens, `@layer components` para las clases). Las fases
siguientes deberían usar esas clases —`.panel`, `.tabla`, `.tabla-num`,
`.campo`, `.boton`— en vez de inventar estilos nuevos.
