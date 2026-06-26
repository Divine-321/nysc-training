import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("nysc_access_token")?.value;
  const { pathname } = request.nextUrl;
  const isPublicInvitePage = pathname === "/admin/accept-invite";

  const isProtected =
    !isPublicInvitePage &&
    (pathname.startsWith("/admin") || pathname.startsWith("/staff"));

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/staff/:path*"],
};
