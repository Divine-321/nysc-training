import { proxyApi } from "@/app/lib/api-proxy";

type Params = {
  params: Promise<{ id: string }>;
};

// Backend-controlled join: records attendance, then returns the meeting URL to
// redirect to. The frontend must use the URL from THIS response rather than any
// meeting_url in the list payload, so attendance tracking cannot be bypassed.
export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  return proxyApi("POST", {
    path: `/api/training/live-sessions/${id}/join/`,
  });
}
