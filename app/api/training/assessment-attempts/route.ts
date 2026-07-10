import { proxyApi } from "@/app/lib/api-proxy";

// Assessment attempts (replaces the old single result). GET lists a staff
// member's attempts; POST starts a new attempt (subject to max-attempt limits).

export async function GET(request: Request) {
  const { search } = new URL(request.url);
  return proxyApi("GET", {
    path: `/api/training/assessment-attempts/${search}`,
  });
}

export async function POST(request: Request) {
  return proxyApi("POST", {
    path: "/api/training/assessment-attempts/",
    request,
  });
}
