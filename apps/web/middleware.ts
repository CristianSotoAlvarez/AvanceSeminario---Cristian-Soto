import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// La protección de rutas se maneja en cada layout client-side mediante useAuth().
// El middleware no puede acceder al accessToken (está en memoria del cliente) ni a
// la cookie refresh_token (la setea la API en otro puerto/dominio en desarrollo).
// En producción con mismo dominio se podría reactivar la verificación de cookie.

export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
