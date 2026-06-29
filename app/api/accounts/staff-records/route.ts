import { proxyApi } from "@/app/lib/api-proxy";

function toPositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const page = toPositiveInt(searchParams.get("page"), 1);
  const pageSize = toPositiveInt(searchParams.get("page_size"), 100);

  return proxyApi("GET", {
    path: `/api/accounts/staff-records/?page=${page}&page_size=${pageSize}`,
  });
}

export async function POST(request: Request) {
  return proxyApi("POST", {
    path: "/api/accounts/staff-records/",
    request,
  });
}
