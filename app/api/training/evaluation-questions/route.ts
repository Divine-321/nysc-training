import { proxyApi, withQuery } from "@/app/lib/api-proxy";

// The course-evaluation question bank. Read-only from the frontend: the
// questions themselves are edited on the backend, not through this app.
// Requires ?enrollment=<id> — see loadEvaluationQuestions in staff-learning.ts.
export async function GET(request: Request) {
  return proxyApi("GET", {
    path: withQuery("/api/training/evaluation-questions/", request),
  });
}
