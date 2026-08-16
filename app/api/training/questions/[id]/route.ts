import { proxyApi } from "@/app/lib/api-proxy";

type Params = {
  params: Promise<{ id: string }>;
};

// Admin: correct or remove a question after it has been added or bulk
// uploaded. Body for PATCH: {text?, points?, order?}.
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;

  return proxyApi("PATCH", {
    path: `/api/training/questions/${id}/`,
    request,
  });
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;

  return proxyApi("DELETE", {
    path: `/api/training/questions/${id}/`,
    request,
  });
}
