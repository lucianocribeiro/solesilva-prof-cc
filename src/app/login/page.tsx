import { FormularioLogin } from './formulario-login';

export const metadata = {
  title: 'Ingresar — Sole Silva',
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-base font-semibold tracking-tight">
          Sole Silva — Administración
        </h1>
        <p className="mb-6 text-sm texto-suave">
          Ingresá la contraseña para acceder.
        </p>

        <div className="panel p-5">
          <FormularioLogin />
        </div>
      </div>
    </main>
  );
}
