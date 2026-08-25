import { proxyApi, withQuery } from "@/app/lib/api-proxy";

export async function GET(request: Request) {
  return proxyApi("GET", {
    path: withQuery("/api/notifications/unread-count/", request),
  });
}
