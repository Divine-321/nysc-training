import { proxyApi } from "@/app/lib/api-proxy";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  return proxyApi("GET", {
    path: `/api/training/enrollments/${id}/`,
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;

  return proxyApi("PATCH", {
    path: `/api/training/enrollments/${id}/`,
    request,
  });
}

// Admin-only un-assignment (confirmed by backend 2026-07-10): removes a
// staff member from a Training Programme.
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;

  return proxyApi("DELETE", {
    path: `/api/training/enrollments/${id}/`,
  });
}
