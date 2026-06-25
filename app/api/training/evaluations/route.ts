import { proxyApi } from "@/app/lib/api-proxy";

export async function GET() {
  return proxyApi("GET", {
    path: "/api/training/evaluations/",
  });
}

export async function POST(request: Request) {
  return proxyApi("POST", {
    path: "/api/training/evaluations/",
    request,
  });
}
