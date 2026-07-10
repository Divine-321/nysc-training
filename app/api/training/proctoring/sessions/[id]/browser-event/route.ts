import { proxyApi } from "@/app/lib/api-proxy";

type Params = {
  params: Promise<{ id: string }>;
};

// Browser-detected proctoring event (no Rekognition involved).
// Body: { event_type: "CAMERA_DISABLED" | "FULLSCREEN_EXIT" | "TAB_SWITCH" | "WINDOW_BLUR" }

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return proxyApi("POST", {
    path: `/api/training/proctoring/sessions/${id}/browser-event/`,
    request,
  });
}
