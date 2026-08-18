import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { browserHeaders } from "@/app/lib/forwarded-headers";
import { API_BASE_URL } from "@/app/lib/portal-api";

const isProduction = process.env.NODE_ENV === "production";
const ACCESS_TOKEN_MAX_AGE = 60 * 20;
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24;

function readTokens(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const data = record.data;
  const tokenSource =
    data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : record;
  const tokens =
    tokenSource.tokens && typeof tokenSource.tokens === "object"
      ? (tokenSource.tokens as Record<string, unknown>)
      : tokenSource;

  const access =
    typeof tokens.access === "string"
      ? tokens.access
      : typeof tokens.access_token === "string"
        ? tokens.access_token
        : null;
  const refresh =
    typeof tokens.refresh === "string"
      ? tokens.refresh
      : typeof tokens.refresh_token === "string"
        ? tokens.refresh_token
        : null;

  if (!access) return null;

  return { access, refresh };
}

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("nysc_refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { success: false, message: "Refresh token is missing.", data: null },
      { status: 401 }
    );
  }

  const response = await fetch(`${API_BASE_URL}/api/accounts/auth/refresh/`, {
    method: "POST",
    headers: {
      ...(await browserHeaders()),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh: refreshToken }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  const nextResponse = NextResponse.json(payload, { status: response.status });

  if (!response.ok) {
    nextResponse.cookies.delete("nysc_access_token");
    nextResponse.cookies.delete("nysc_refresh_token");
    return nextResponse;
  }

  const tokens = readTokens(payload);

  if (!tokens) {
    nextResponse.cookies.delete("nysc_access_token");
    nextResponse.cookies.delete("nysc_refresh_token");
    return NextResponse.json(
      { success: false, message: "Refresh response was incomplete.", data: null },
      { status: 502 }
    );
  }

  nextResponse.cookies.set("nysc_access_token", tokens.access, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  if (tokens.refresh) {
    nextResponse.cookies.set("nysc_refresh_token", tokens.refresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  }

  return nextResponse;
}
