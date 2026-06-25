import { proxyApi } from "@/app/lib/api-proxy";

export async function POST() {
  return proxyApi("POST", {
    path: "/api/notifications/mark-all-read/",
    body: {},
  });
}
