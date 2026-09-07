import { salir } from '@/lib/auth-actions';

export function BotonSalir() {
  return (
    <form action={salir}>
      <button type="submit" className="boton-secundario">
        Salir
      </button>
    </form>
  );
}
