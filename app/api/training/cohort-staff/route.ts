import { proxyApi, withQuery } from "@/app/lib/api-proxy";

export async function GET(request: Request) {
  return proxyApi("GET", {
    path: withQuery("/api/training/cohort-staff/", request),
  });
}

export async function POST(request: Request) {
  return proxyApi("POST", {
    path: "/api/training/cohort-staff/",
    request,
  });
}