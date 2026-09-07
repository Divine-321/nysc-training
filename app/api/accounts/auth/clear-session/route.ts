import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Deletes our own httpOnly session cookies without calling the backend's
 * logout endpoint.
 *
 * For the one case where the session is already known to be dead
 * server-side — AuthGuard reacting to a 401, most often the backend's idle
 * timeout — a full round trip asking Django to log out a session it has
 * already expired is pure waste. The deliberate "Sign out" button still
 * uses the real /api/accounts/auth/logout route: a live session genuinely
 * needs the backend told, this one doesn't.
 */
export async function POST() {
  const cookieStore = await cookies();

  cookieStore.delete("nysc_access_token");
  cookieStore.delete("nysc_refresh_token");

  return new NextResponse(null, { status: 204 });
}
