import { proxyApi, withQuery } from "@/app/lib/api-proxy";

type Params = {
  params: Promise<{ id: string }>;
};

// A single programme, with its course and that course's assigned modules.
// Without this the route answered 405 to every GET, so a staff member's
// course loaded with no modules inside it.
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;

  return proxyApi("GET", {
    path: withQuery(`/api/training/programmes/${id}/`, request),
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;

  return proxyApi("DELETE", {
    path: `/api/training/programmes/${id}/`,
  });
}
