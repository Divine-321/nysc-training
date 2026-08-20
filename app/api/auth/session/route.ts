import { NextResponse } from "next/server";
import { setSessionCookies } from "@/app/lib/session-cookies";

/**
 * Writes the httpOnly session cookies for a token pair the browser obtained
 * directly from Railway (see app/lib/auth-client.ts — login and device
 * verification now bypass the Next.js proxy to dodge Railway's DDoS
 * protection). This route itself never calls Railway; it only sets cookies
 * on the response to the caller's own same-origin request.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    tokens?: { access?: string; refresh?: string };
  } | null;

  const access = body?.tokens?.access;
  const refresh = body?.tokens?.refresh;

  if (!access || !refresh) {
    return NextResponse.json(
      { success: false, message: "Tokens are required.", data: null },
      { status: 400 },
    );
  }

  return setSessionCookies(
    NextResponse.json({ success: true, data: null }),
    { access, refresh },
  );
}
