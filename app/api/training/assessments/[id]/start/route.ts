import { proxyApi } from "@/app/lib/api-proxy";

// Start or resume an assessment attempt (idempotent). The backend creates
// the staff member's IN_PROGRESS attempt with a stored shuffle seed and
// returns the questions/options in that attempt's randomized order — the
// same order on every refresh until submission.

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  return proxyApi("POST", {
    path: `/api/training/assessments/${id}/start/`,
    request,
  });
}
