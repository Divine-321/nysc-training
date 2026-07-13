import { proxyApi } from "@/app/lib/api-proxy";

// Reusable-modules restructure (2026-07-12): sets the course's module list.
// Body {module_ids: [...]} — an ORDERED array; one call handles attach,
// remove and reorder (it replaces the course's module assignments).

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  return proxyApi("POST", {
    path: `/api/training/courses/${id}/assign-modules/`,
    request,
  });
}
