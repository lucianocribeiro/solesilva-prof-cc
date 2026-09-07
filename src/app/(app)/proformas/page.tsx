import { ErrorDatos } from '@/components/error-datos';
import { ErrorAirtable } from '@/lib/airtable';
import { cargarRenglonesVenta } from '@/lib/renglones-venta';

import { PantallaProformas } from './pantalla-proformas';

export const metadata = {
  title: 'Proformas — Sole Silva',
};

export const dynamic = 'force-dynamic';

export default async function ProformasPage() {
  try {
    const renglones = await cargarRenglonesVenta();
    return <PantallaProformas renglones={renglones} />;
  } catch (error) {
    const mensaje =
      error instanceof ErrorAirtable
        ? error.message
        : 'Error inesperado al leer Airtable.';
    return (
      <section>
        <h1 className="titulo-pagina">Proformas</h1>
        <ErrorDatos mensaje={mensaje} />
      </section>
    );
  }
}
