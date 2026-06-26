import { proxyApi } from "@/app/lib/api-proxy";

export async function GET(request: Request) {
  const type = new URL(request.url).searchParams.get("type");
  const search = type ? `?type=${encodeURIComponent(type)}` : "";

  return proxyApi("GET", {
    path: `/api/training/cloudinary-signature/${search}`,
  });
}
