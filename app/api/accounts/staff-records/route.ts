import { proxyApi } from "@/app/lib/api-proxy";

export async function GET() {
  return proxyApi("GET", {
    path: "/api/accounts/staff-records/",
  });
}

export async function POST(request: Request) {
  return proxyApi("POST", {
    path: "/api/accounts/staff-records/",
    request,
  });
}
