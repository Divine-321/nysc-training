import { proxyApi } from "@/app/lib/api-proxy";

export async function GET() {
  return proxyApi("GET", {
    path: "/api/learning/books/",
  });
}

export async function POST(request: Request) {
  return proxyApi("POST", {
    path: "/api/learning/books/",
    request,
  });
}
