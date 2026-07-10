import { proxyApi } from "@/app/lib/api-proxy";

// ProctoringSession list — admin overview of all sessions.
// Mirrors GET /api/training/proctoring/sessions/ on the backend.

export async function GET(request: Request) {
  const { search } = new URL(request.url);
  return proxyApi("GET", {
    path: `/api/training/proctoring/sessions/${search}`,
  });
}
