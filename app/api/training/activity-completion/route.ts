import { proxyApi } from "@/app/lib/api-proxy";

// Activity completion tracking (feeds Module -> Course progress). Provisional
// backend path pending the restructure.

export async function GET(request: Request) {
  const { search } = new URL(request.url);
  return proxyApi("GET", {
    path: `/api/training/activity-completions/${search}`,
  });
}

export async function POST(request: Request) {
  return proxyApi("POST", {
    path: "/api/training/activity-completions/",
    request,
  });
}
