import { type NextRequest, NextResponse } from "next/server";

// Bloqueio emergencial do piloto ROTA29 solicitado pela coordenação.
// Todo HTML, autenticação, cadastro, administração e API interna desta prévia
// é direcionado ao aviso até uma liberação EXPLÍCITA da coordenação.
// O middleware é intencionalmente independente de sessão, cookies ou banco.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/pilot-status") {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  }
  const response = NextResponse.redirect(new URL("/pilot-status", request.url), 307);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|ogg|mp3|wav|woff|woff2|ico|css|js)$).*)",
  ],
};
