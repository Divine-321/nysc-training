import { proxyApi } from "@/app/lib/api-proxy";

// Pre-assessment identity verification + session start.
// The frontend captures a camera image and posts it here with the assessment
// and enrollment ids; the backend compares the image against the registered
// staff photo via AWS Rekognition and, on success, atomically creates the
// assessment attempt and its ProctoringSession. The frontend never talks to
// Rekognition directly.
//
// Body: { assessment_id: number, enrollment_id: number, image_data: string (base64) }

export async function POST(request: Request) {
  return proxyApi("POST", {
    path: "/api/training/proctoring/sessions/start/",
    request,
  });
}
