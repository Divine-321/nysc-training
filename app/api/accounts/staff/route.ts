import { proxyApi } from "@/app/lib/api-proxy";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const page = searchParams.get("page") ?? "1";
  const pageSize = searchParams.get("page_size") ?? "100";

  return proxyApi("GET", {
    path: `/api/accounts/staff/?page=${page}&page_size=${pageSize}`,
  });
}