import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

// A callback grava os cookies e identifica explicitamente o retorno do Google.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/start?auth_error=missing_code", origin));
  const db = await createClient();
  const { error } = await db.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("ROTA29 Google OAuth:", error.message);
    return NextResponse.redirect(new URL("/start?auth_error=exchange_failed", origin));
  }
  return NextResponse.redirect(new URL("/start?after_auth=1", origin));
}
