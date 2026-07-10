import { proxyApi } from "@/app/lib/api-proxy";

type Params = {
  params: Promise<{ id: string }>;
};

// Full ProctoringSession detail with all events — admin review use.

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  return proxyApi("GET", {
    path: `/api/training/proctoring/sessions/${id}/`,
  });
}
