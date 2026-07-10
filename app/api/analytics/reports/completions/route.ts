import { proxyApi } from "@/app/lib/api-proxy";

export async function GET(request: Request) {
  const { search } = new URL(request.url);
  return proxyApi("GET", {
    path: `/api/analytics/reports/completions/${search}`,
  });
}
