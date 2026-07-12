import { proxyApi } from "@/app/lib/api-proxy";

// Admin: who joined a live session (LiveSessionAttendance records).

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  return proxyApi("GET", {
    path: `/api/training/live-sessions/${id}/attendance/`,
  });
}
