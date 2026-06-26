import { proxyApi } from "@/app/lib/api-proxy";

export async function GET(request: Request) {
  const courseId = new URL(request.url).searchParams.get("course");
  const search = courseId ? `?course=${encodeURIComponent(courseId)}` : "";

  return proxyApi("GET", {
    path: `/api/training/modules/${search}`,
  });
}

export async function POST(request: Request) {
  return proxyApi("POST", {
    path: "/api/training/modules/",
    request,
  });
}
