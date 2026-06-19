import { proxyApi } from "@/app/lib/api-proxy";

export async function POST(request: Request) {
  return proxyApi("POST", {
    path: "/api/accounts/auth/change-password/",
    request,
  });
}
