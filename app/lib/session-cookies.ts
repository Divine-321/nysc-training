import type { NextResponse } from "next/server";

const isProduction = process.env.NODE_ENV === "production";

// Access tokens last 20 minutes, refresh tokens 1 day (backend settings).
const ACCESS_TOKEN_MAX_AGE = 60 * 20;
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24;

/**
 * Writes the session cookies for a freshly issued token pair.
 *
 * Shared by every route that establishes or renews a session — login,
 * device verification and refresh — so the flags stay identical across all
 * three. Refresh tokens rotate on use, so the refresh cookie must be
 * overwritten on every renewal, not just at login.
 */
export function setSessionCookies(
  response: NextResponse,
  tokens: { access: string; refresh: string },
) {
  response.cookies.set("nysc_access_token", tokens.access, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  response.cookies.set("nysc_refresh_token", tokens.refresh, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  return response;
}
