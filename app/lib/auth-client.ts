import {
  API_BASE_URL,
  requiresDeviceVerification,
  type AuthData,
  type DeviceVerificationRequired,
  type LoginCredentials,
  type LoginResponse,
  type VerifyDeviceCredentials,
} from "@/app/lib/portal-api";

/**
 * Login and device verification talk to Railway straight from the browser
 * instead of through the Next.js proxy. Railway's DDoS protection (Hikari)
 * was 429ing the Vercel server's outbound requests — forwarding the
 * browser's headers through the proxy wasn't enough, so the request has to
 * actually originate from a browser: real TLS handshake, real end-user IP.
 *
 * The backend returns tokens in the JSON body (it never set cookies for
 * these routes), so this only trades the proxy hop for a direct fetch —
 * establishSession() below still gets those tokens into httpOnly cookies via
 * the Next.js server, same as before, just as a second, same-origin call.
 */
async function backendFetch<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    const message = payload?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export function directLogin(credentials: LoginCredentials) {
  return backendFetch<LoginResponse>("/api/accounts/auth/login/", credentials);
}

/** Completes an admin login on a new device, using the OTP sent by email. */
export function directVerifyDevice(credentials: VerifyDeviceCredentials) {
  return backendFetch<LoginResponse>("/api/accounts/auth/verify-device/", credentials);
}

/**
 * Hands a freshly issued token pair to the Next.js server so it can write the
 * httpOnly session cookies exactly as a proxied login used to. Same-origin —
 * never reaches Railway, so it can't be blocked by Hikari.
 */
export async function establishSession(
  data: AuthData | DeviceVerificationRequired,
) {
  if (requiresDeviceVerification(data)) return; // no tokens yet

  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokens: data.tokens }),
  });

  if (!response.ok) {
    throw new Error(
      "Signed in, but could not start your session. Please try again.",
    );
  }
}
