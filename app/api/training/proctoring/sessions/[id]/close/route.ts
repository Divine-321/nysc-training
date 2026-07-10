import { proxyApi } from "@/app/lib/api-proxy";

type Params = {
  params: Promise<{ id: string }>;
};

// Called when the staff member submits their assessment. Ends the proctoring
// session; the backend transitions it to CLEAN if no flags were raised.

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  return proxyApi("POST", {
    path: `/api/training/proctoring/sessions/${id}/close/`,
  });
}
