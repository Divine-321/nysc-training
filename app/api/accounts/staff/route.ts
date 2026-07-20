import { proxyApi, withPagination } from "@/app/lib/api-proxy";

export async function GET(request: Request) {
  return proxyApi("GET", {
    path: withPagination("/api/accounts/staff/", request),
  });
}
