import { proxyApi } from "@/app/lib/api-proxy";

/**
 * Signs a direct-to-Cloudinary upload.
 *
 * Both parameters are forwarded. `type` chooses the folder and permissions;
 * `content_type` tells the backend which media an activity upload is —
 * VIDEO, AUDIO, PDF or PPT — so it can return the preset that matches.
 *
 * They are read and re-encoded rather than passed through wholesale so only
 * these two ever reach the backend. An earlier version forwarded `type` alone
 * and silently dropped `content_type`, which left the backend defaulting to
 * video and refusing every PDF and slide deck.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const forwarded = new URLSearchParams();

  for (const name of ["type", "content_type"] as const) {
    const value = params.get(name);
    if (value) forwarded.set(name, value);
  }

  const search = forwarded.size > 0 ? `?${forwarded}` : "";

  return proxyApi("GET", {
    path: `/api/training/cloudinary-signature/${search}`,
  });
}
