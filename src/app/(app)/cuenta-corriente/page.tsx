import { ErrorDatos } from '@/components/error-datos';
import { ErrorAirtable } from '@/lib/airtable';
import { armarCuentaCorriente } from '@/lib/cuenta-corriente';
import { cargarCuentaCorriente } from '@/lib/datos';

import { ListaClientes } from './lista-clientes';

export const metadata = {
  title: 'Cuenta corriente — Sole Silva',
};

// Los datos se leen en cada visita; el cacheo vive en las llamadas a Airtable.
export const dynamic = 'force-dynamic';

export default async function CuentaCorrientePage() {
  let bloques;
  try {
    const { padron, saldosIniciales, ventas, cobranzas } =
      await cargarCuentaCorriente();
    bloques = armarCuentaCorriente(padron, saldosIniciales, ventas, cobranzas);
  } catch (error) {
    const mensaje =
      error instanceof ErrorAirtable
        ? error.message
        : 'Error inesperado al leer Airtable.';
    return (
      <section>
        <h1 className="titulo-pagina">Cuenta corriente</h1>
        <ErrorDatos mensaje={mensaje} />
      </section>
    );
  }

  return (
    <section>
      <h1 className="titulo-pagina">Cuenta corriente</h1>
      <p className="mt-1 text-sm texto-suave">
        Saldo inicial, ventas y cobranzas por cliente, con un único saldo en
        dólares. Cada movimiento conserva su importe original y su moneda; el
        equivalente en dólares sale de Airtable, no lo calcula la app.
      </p>

      <ListaClientes bloques={bloques} />
    </section>
  );
}
