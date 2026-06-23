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

export async function getAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get("nysc_access_token")?.value;
}

export async function proxyApi(method: string, options: ProxyOptions) {
  const accessToken = options.auth === false ? null : await getAccessToken();

  if (options.auth !== false && !accessToken) {
    return NextResponse.json(
      { success: false, message: "Not authenticated.", data: null },
      { status: 401 }
    );
  }

  const init: RequestInit = {
    method,
    headers: {
      ...JSON_HEADERS,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    cache: "no-store",
  };

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

  const response = await fetch(`${API_BASE_URL}${options.path}`, init);
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json(payload, { status: response.status });
}

export function withTrailingSlash(path: string) {
  return path.endsWith("/") ? path : `${path}/`;
}
