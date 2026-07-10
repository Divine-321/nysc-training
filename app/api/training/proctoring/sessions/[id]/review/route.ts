import { proxyApi } from "@/app/lib/api-proxy";

// Admin manual override of a proctoring session's status (CLEAN /
// INVALIDATED / FLAGGED / ACTIVE).

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
