import { NextResponse } from "next/server";
import { proxyApi } from "@/app/lib/api-proxy";

const isProduction = process.env.NODE_ENV === "production";

export async function POST(request: Request) {
  const response = await proxyApi("POST", {
    auth: false,
    path: "/api/accounts/auth/verify-email/",
    request,
  });

  const payload = await response.clone().json().catch(() => null);
  const nextResponse = NextResponse.json(payload, { status: response.status });

  if (response.ok && payload?.data?.tokens) {
    nextResponse.cookies.set("nysc_access_token", payload.data.tokens.access, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    nextResponse.cookies.set("nysc_refresh_token", payload.data.tokens.refresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  return nextResponse;
}
