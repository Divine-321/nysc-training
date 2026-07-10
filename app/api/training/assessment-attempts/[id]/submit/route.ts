import { proxyApi } from "@/app/lib/api-proxy";

type Params = {
  params: Promise<{ id: string }>;
};

// Submit answers for an in-progress attempt; backend grades and returns the score.
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return proxyApi("POST", {
    path: `/api/training/assessment-attempts/${id}/submit/`,
    request,
  });
}
