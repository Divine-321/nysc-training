import { proxyApi } from "@/app/lib/api-proxy";

// New-model progress endpoint (Course -> Module -> Activity restructure).
// Replaces complete-document; the backend computes module/course progress.

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return proxyApi("POST", {
    path: `/api/training/enrollments/${id}/complete-activity/`,
    request,
  });
}
