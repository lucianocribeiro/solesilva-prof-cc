import { NextResponse, type NextRequest } from 'next/server';

import { COOKIE_SESION, tokenEsValido } from '@/lib/session';

export const config = {
  /**
   * Se ejecuta en todas las rutas menos los assets internos de Next
   * y los archivos con extensión.
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};

export async function middleware(request: NextRequest) {
  const enLogin = request.nextUrl.pathname === '/login';
  const conSesion = await tokenEsValido(request.cookies.get(COOKIE_SESION)?.value);

  if (!conSesion && !enLogin) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (conSesion && enLogin) {
    return NextResponse.redirect(new URL('/cuenta-corriente', request.url));
  }

  return NextResponse.next();
}
