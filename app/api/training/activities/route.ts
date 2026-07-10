import { proxyApi } from "@/app/lib/api-proxy";

// Activities (leaf of Course -> Module -> Activity). Provisional backend path
// pending the restructure; adjust if the shipped schema differs.

export async function GET(request: Request) {
  const { search } = new URL(request.url);
  return proxyApi("GET", {
    path: `/api/training/activities/${search}`,
  });
}

export async function POST(request: Request) {
  return proxyApi("POST", {
    path: "/api/training/activities/",
    request,
  });
}
