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
  const publicRoutes = ['/start', '/auth/callback', '/splash.mp4', '/splash_v2.mp4', '/vinheta.mp4'];
  // Página inicial e imagem social devem permanecer públicas para prévia no WhatsApp.
  const pathname = request.nextUrl.pathname;
  const isPublicRoute = pathname === "/" || pathname.startsWith("/opengraph-image")
    || pathname.startsWith("/twitter-image")
    || publicRoutes.some(route => pathname.startsWith(route));

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/start";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
