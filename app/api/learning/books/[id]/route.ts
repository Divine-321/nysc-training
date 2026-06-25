import { proxyApi } from "@/app/lib/api-proxy";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  return proxyApi("GET", {
    path: `/api/learning/books/${id}/`,
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;

  return proxyApi("PATCH", {
    path: `/api/learning/books/${id}/`,
    request,
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;

  return proxyApi("DELETE", {
    path: `/api/learning/books/${id}/`,
  });
}
