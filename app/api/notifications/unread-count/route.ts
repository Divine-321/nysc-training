import { proxyApi } from "@/app/lib/api-proxy";

export async function GET() {
  return proxyApi("GET", {
    path: "/api/notifications/unread-count/",
  });
}
