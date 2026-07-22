import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const accessToken = request.cookies.get("nysc_access_token")?.value;
  const refreshToken = request.cookies.get("nysc_refresh_token")?.value;
  const { pathname } = request.nextUrl;
  const isPublicInvitePage = pathname === "/admin/accept-invite";

  const isProtected =
    !isPublicInvitePage &&
    (pathname.startsWith("/admin") || pathname.startsWith("/staff"));

  // The access token is short-lived and expires while a user sits idle. Don't
  // log them out for that alone: as long as the refresh token is still present,
  // the app swaps it for a fresh access token on the first API call. Only
  // redirect to /login when the session is fully gone (both tokens absent).
  if (isProtected && !accessToken && !refreshToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/staff/:path*"],
};
