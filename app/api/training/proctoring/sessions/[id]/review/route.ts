import { proxyApi } from "@/app/lib/api-proxy";

// Admin manual override of a proctoring session's status (CLEAN / INVALIDATED
// / FLAGGED), with an optional review_note. ACTIVE is set by the system while
// an exam runs and is not a decision a reviewer can make.

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  return proxyApi("POST", {
    path: `/api/training/proctoring/sessions/${id}/review/`,
    request,
  });
}
