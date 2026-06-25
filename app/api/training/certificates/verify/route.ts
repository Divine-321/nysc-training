import { NextRequest } from "next/server";
import { proxyApi } from "@/app/lib/api-proxy";

export async function GET(request: NextRequest) {
  const certificateId = request.nextUrl.searchParams.get("certificate_id");
  const search = certificateId
    ? `?certificate_id=${encodeURIComponent(certificateId)}`
    : "";

  return proxyApi("GET", {
    auth: false,
    path: `/api/training/certificates/verify/${search}`,
  });
}
