import { proxyApi } from "@/app/lib/api-proxy";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  return proxyApi("GET", { path: `/api/training/categories/${id}/` });
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  return proxyApi("PUT", { path: `/api/training/categories/${id}/`, request });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  return proxyApi("PATCH", { path: `/api/training/categories/${id}/`, request });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  return proxyApi("DELETE", { path: `/api/training/categories/${id}/` });
}
