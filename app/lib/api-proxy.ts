import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/app/lib/portal-api";

type ProxyOptions = {
  auth?: boolean;
  body?: unknown;
  path: string;
  request?: Request;
};

const JSON_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

const isProduction = process.env.NODE_ENV === "production";
const ACCESS_TOKEN_MAX_AGE = 60 * 20;
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24;

export async function getAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get("nysc_access_token")?.value ?? null;
}

async function getRefreshToken() {
  const cookieStore = await cookies();
  return cookieStore.get("nysc_refresh_token")?.value ?? null;
}

async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete("nysc_access_token");
  cookieStore.delete("nysc_refresh_token");
}

function readRefreshedTokens(payload: unknown) {
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

async function refreshAccessToken() {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) return null;

  const response = await fetch(`${API_BASE_URL}/api/accounts/auth/refresh/`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ refresh: refreshToken }),
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    await clearAuthCookies();
    return null;
  }

  const tokens = readRefreshedTokens(payload);

  if (!tokens) {
    await clearAuthCookies();
    return null;
  }

  const cookieStore = await cookies();
  cookieStore.set("nysc_access_token", tokens.access, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  if (tokens.refresh) {
    cookieStore.set("nysc_refresh_token", tokens.refresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  }

  return tokens.access;
}

async function readResponsePayload(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;
}

export async function proxyApi(method: string, options: ProxyOptions) {
  let accessToken = options.auth === false ? null : await getAccessToken();

  if (options.auth !== false && !accessToken) {
    accessToken = await refreshAccessToken();
  }

  if (options.auth !== false && !accessToken) {
    return NextResponse.json(
      { success: false, message: "Not authenticated.", data: null },
      { status: 401 }
    );
  }

  const createInit = (token: string | null): RequestInit => ({
    method,
    headers: {
      ...JSON_HEADERS,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  const init = createInit(accessToken);

  if (!["GET", "HEAD"].includes(method)) {
    if (options.body !== undefined) {
      init.body = JSON.stringify(options.body);
    } else if (options.request) {
      const contentType = options.request.headers.get("content-type") ?? "";
      if (contentType.includes("multipart/form-data")) {
        const formData = await options.request.formData();
        init.body = formData;
        init.headers = {
          Accept: "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        };
      } else {
        const text = await options.request.text();
        init.body = text || undefined;
      }
    }
  }

  let response = await fetch(`${API_BASE_URL}${options.path}`, init);

  if (response.status === 401 && options.auth !== false) {
    const refreshedAccessToken = await refreshAccessToken();

    if (refreshedAccessToken) {
      const retryInit = {
        ...init,
        headers: {
          ...(init.headers as Record<string, string>),
          Authorization: `Bearer ${refreshedAccessToken}`,
        },
      };

      response = await fetch(`${API_BASE_URL}${options.path}`, retryInit);
    }

    if (response.status === 401) {
      await clearAuthCookies();
    }
  }

  const payload = await readResponsePayload(response);

  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json(payload, { status: response.status });
}

export function withTrailingSlash(path: string) {
  return path.endsWith("/") ? path : `${path}/`;
}
