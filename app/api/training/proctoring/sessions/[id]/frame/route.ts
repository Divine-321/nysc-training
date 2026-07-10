import { proxyApi } from "@/app/lib/api-proxy";

type Params = {
  params: Promise<{ id: string }>;
};

// Periodic monitoring frame captured during an active attempt. The backend runs
// face detection / identity checks via Rekognition and records any anomalies as
// ProctoringEvents on the session.
//
// Body: { image_data: string (base64 JPEG/PNG) }
// Response data may include: events_detected (string[])

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return proxyApi("POST", {
    path: `/api/training/proctoring/sessions/${id}/frame/`,
    request,
  });
}
