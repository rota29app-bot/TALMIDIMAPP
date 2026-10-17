import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Array of public routes
  const publicRoutes = [
    '/start', '/auth/callback', '/pilot-status', '/splash.mp4', '/splash_v2.mp4', '/vinheta.mp4',
    '/sw.js', '/manifest.json', '/offline.html', '/pwa-icon-192.png',
    '/pwa-icon-512.png', '/pwa-icon-180.png',
  ];
  // Página inicial e imagem social devem permanecer públicas para prévia no WhatsApp.
  const pathname = request.nextUrl.pathname;
  const isPublicRoute = pathname === "/" || pathname.startsWith("/opengraph-image")
    || pathname.startsWith("/twitter-image")
    || publicRoutes.some(route => pathname.startsWith(route));

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/start";
    const redirect = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    return redirect;
  }

  // O servidor confere prazo, aprovação e encerramento em cada rota da jornada.
  const journeyRoutes = ['/onboarding','/radar','/pdd','/stage','/hoje','/diary',
    '/dashboard','/report','/validate','/marco','/pastor','/settings','/congratulations','/admin'];
  const journey = pathname === '/' || journeyRoutes.some(route => pathname === route || pathname.startsWith(route+'/'));
  if (user && journey) {
    const { data: access, error } = await supabase.rpc('rota29_pilot_access');
    // A primeira insígnia encerra a jornada, mas a tela de celebração
    // precisa continuar acessível ao próprio participante autenticado.
    const canSeeFinalBadge = !error && access?.status === 'completed'
      && (pathname === '/congratulations' || pathname.startsWith('/congratulations/'));
    if (error || (!access?.allowed && !canSeeFinalBadge)) {
      const url = request.nextUrl.clone();
      url.pathname = '/pilot-status'; url.search = '';
      const redirect = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
      return redirect;
    }
  }

  return supabaseResponse;
}
