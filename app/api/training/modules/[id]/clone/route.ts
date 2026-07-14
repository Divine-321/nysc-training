import { proxyApi } from "@/app/lib/api-proxy";

// Module clone (moved to its proper home 2026-07-14): duplicates the module,
// its activities and its assessments (with questions). {id} = module id.

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  return proxyApi("POST", {
    path: `/api/training/modules/${id}/clone/`,
    request,
  });
}
