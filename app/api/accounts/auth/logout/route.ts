import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { proxyApi } from "@/app/lib/api-proxy";

export async function POST(request: Request) {
  const response = await proxyApi("POST", {
    path: "/api/accounts/auth/logout/",
    request,
  });

  const payload = response.status === 204
    ? null
    : await response.clone().json().catch(() => null);
  const nextResponse = payload
    ? NextResponse.json(payload, { status: response.status })
    : new NextResponse(null, { status: response.status });
  const cookieStore = await cookies();

  cookieStore.delete("nysc_access_token");
  cookieStore.delete("nysc_refresh_token");

  return nextResponse;
}
