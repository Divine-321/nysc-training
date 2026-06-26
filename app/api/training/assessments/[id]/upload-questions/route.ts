import { proxyApi } from "@/app/lib/api-proxy";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  return proxyApi("POST", {
    path: `/api/training/assessments/${id}/upload-questions/`,
    request,
  });
}
