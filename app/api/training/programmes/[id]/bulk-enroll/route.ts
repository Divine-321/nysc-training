import { proxyApi } from "@/app/lib/api-proxy";

// CSV bulk enrollment into a Training Programme ("file_number" column).
// Replaces the old cohort bulk-upload.

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  return proxyApi("POST", {
    path: `/api/training/programmes/${id}/bulk-enroll/`,
    request,
  });
}
