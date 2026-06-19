import { proxyApi } from "@/app/lib/api-proxy";

export async function POST(request: Request) {
  return proxyApi("POST", {
    auth: false,
    path: "/api/accounts/auth/lookup/",
    request,
  });
}
