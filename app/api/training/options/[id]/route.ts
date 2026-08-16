import { proxyApi } from "@/app/lib/api-proxy";

type Params = {
  params: Promise<{ id: string }>;
};

// Admin: correct an option's text or mark it as the answer.
// Body for PATCH: {text?, is_correct?}.
//
// Setting is_correct to true clears it on every sibling option server-side, so
// only the newly correct option needs sending.
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;

  return proxyApi("PATCH", {
    path: `/api/training/options/${id}/`,
    request,
  });
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;

  return proxyApi("DELETE", {
    path: `/api/training/options/${id}/`,
    request,
  });
}
