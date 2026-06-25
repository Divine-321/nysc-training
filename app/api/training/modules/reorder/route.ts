import { proxyApi } from "@/app/lib/api-proxy";

export async function PATCH(request: Request) {
  return proxyApi("PATCH", { path: "/api/training/modules/reorder/", request });
}
