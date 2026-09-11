import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { proxyApi } from "@/app/lib/api-proxy";

export async function POST(request: Request) {
  // The backend is told, but its answer does not decide whether signing out
  // worked: what actually ends the session in this browser is the two
  // cookies below. This used to return the backend's status, so a backend
  // that was down, slow, or had moved this endpoint would report failure
  // for a sign-out that had in fact already happened here. Caught rather
  // than awaited bare for the same reason — a network error must not skip
  // the cookie clearing underneath it.
  const backendResponse = await proxyApi("POST", {
    path: "/api/accounts/auth/logout/",
    request,
  }).catch(() => null);

  if (!backendResponse?.ok) {
    console.warn(
      "[logout] The backend did not confirm sign-out" +
        (backendResponse ? ` (HTTP ${backendResponse.status})` : " (no response)") +
        " — session cookies were cleared locally regardless.",
    );
  }

  const cookieStore = await cookies();

  cookieStore.delete("nysc_access_token");
  cookieStore.delete("nysc_refresh_token");

  // 204 means "this browser's session is over", which is true by this point.
  // A non-2xx from here now means the route genuinely didn't run — which is
  // exactly what the callers check before treating anyone as signed out.
  return new NextResponse(null, { status: 204 });
}
