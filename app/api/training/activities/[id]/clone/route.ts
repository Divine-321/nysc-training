import { proxyApi } from "@/app/lib/api-proxy";

// Module clone. NOTE: despite living under /activities/, the backend
// documents this as "a complete duplicate of a module, its activities, and
// its assessments (with questions)" — the {id} is the MODULE id.

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  return proxyApi("POST", {
    path: `/api/training/activities/${id}/clone/`,
    request,
  });
}
