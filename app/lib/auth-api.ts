import { browserHeaders } from "@/app/lib/forwarded-headers";
import { API_BASE_URL, type LoginCredentials, type LoginResponse, type VerifyDeviceCredentials } from "@/app/lib/portal-api";

// Server-only: pulls in next/headers (via browserHeaders) to forward the
// caller's browser headers to the backend, so this must stay out of
// portal-api.ts — that module is imported by client components too, and
// next/headers can't reach a Client Component's bundle.

async function apiFetch<T>(path: string, init?: RequestInit, token?: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(await browserHeaders()),
      Accept: "application/json",
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const message = payload?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export async function loginUser(credentials: LoginCredentials) {
  return apiFetch<LoginResponse>("/api/accounts/auth/login/", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

/** Completes an admin login on a new device, using the OTP sent by email. */
export async function verifyDevice(credentials: VerifyDeviceCredentials) {
  return apiFetch<LoginResponse>("/api/accounts/auth/verify-device/", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}
