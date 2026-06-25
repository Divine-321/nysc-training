import { proxyApi } from "@/app/lib/api-proxy";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  { params }: Params
) {
  const { id } = await params;

  return proxyApi("GET", {
    path: `/api/training/cohorts/${id}/`,
  });
}

export async function PATCH(
  request: Request,
  { params }: Params
) {
  const { id } = await params;

  return proxyApi("PATCH", {
    path: `/api/training/cohorts/${id}/`,
    request,
  });
}

export async function DELETE(
  _request: Request,
  { params }: Params
) {
  const { id } = await params;

  return proxyApi("DELETE", {
    path: `/api/training/cohorts/${id}/`,
  });
}