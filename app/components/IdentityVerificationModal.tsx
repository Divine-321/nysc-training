"use client";

import { useEffect, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import CameraPreview from "@/app/components/CameraPreview";
import { useCamera } from "@/app/components/useCamera";
import { startProctoringSession } from "@/app/lib/proctoring";
import type { ProctoringStartResult } from "@/app/lib/training-types";

type IdentityVerificationModalProps = {
  assessmentId: number;
  enrollmentId: number;
  /** Called after the backend confirms the face matches the registered photo. */
  onVerified: (result: ProctoringStartResult) => void;
  onCancel: () => void;
};

type Step = "camera" | "confirm" | "verifying" | "failed" | "verified";

// Pre-assessment identity verification (PDF section 14).
// Captures a camera image and sends it to the backend, which compares it with
// the registered staff photo via AWS Rekognition. The assessment can only
// start after this succeeds — the modal blocks the exam until then.
export default function IdentityVerificationModal({
  assessmentId,
  enrollmentId,
  onVerified,
  onCancel,
}: IdentityVerificationModalProps) {
  const camera = useCamera();
  const [step, setStep] = useState<Step>("camera");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [failureMessage, setFailureMessage] = useState("");

  useEffect(() => {
    void camera.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = () => {
    const frame = camera.captureFrame();

    if (!frame) return;

    setCapturedImage(frame);
    setStep("confirm");
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setFailureMessage("");
    setStep("camera");
    void camera.start();
  };

  const handleVerify = async () => {
    if (!capturedImage) return;

    setStep("verifying");

    const result = await startProctoringSession({
      assessmentId,
      enrollmentId,
      imageData: capturedImage,
    });

    if (!result.verified) {
      setFailureMessage(result.message);
      setStep("failed");
      return;
    }

    setStep("verified");
    // Keep the camera running: the proctoring monitor takes over from here.
    window.setTimeout(() => onVerified(result), 900);
  };

  const handleCancel = () => {
    camera.stop();
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-4">
      <div className="my-auto max-h-[95vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-[#1a6b3c]">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              Identity Verification
            </h3>
            <p className="text-xs text-gray-500">
              We need to confirm it is really you before the assessment starts.
            </p>
          </div>
        </div>

        {step === "confirm" || step === "verifying" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={capturedImage ?? ""}
            alt="Captured verification"
            className="aspect-video max-h-[50vh] w-full -scale-x-100 rounded-xl bg-gray-900 object-cover"
          />
        ) : (
          <CameraPreview
            videoRef={camera.videoRef}
            status={camera.status}
            error={camera.error}
            className="aspect-video max-h-[50vh] w-full"
          />
        )}

        {step === "failed" && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <XCircle size={18} className="mt-0.5 shrink-0" />
            <p>{failureMessage || "Verification failed. Please try again."}</p>
          </div>
        )}

        {step === "verified" && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-700">
            <CheckCircle2 size={18} className="shrink-0" />
            Identity verified. Starting your assessment...
          </div>
        )}

        <p className="mt-4 text-xs text-gray-500">
          Look straight at the camera in a well-lit place. Your photo is
          compared with your registered profile picture — it is not shared
          anywhere else.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={step === "verifying" || step === "verified"}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>

          {step === "camera" && (
            <button
              type="button"
              onClick={handleCapture}
              disabled={camera.status !== "active"}
              className="flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#145530] disabled:opacity-50"
            >
              <Camera size={16} /> Capture Photo
            </button>
          )}

          {(step === "confirm" || step === "failed") && (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                <RefreshCcw size={16} /> Retake
              </button>
              {step === "confirm" && (
                <button
                  type="button"
                  onClick={handleVerify}
                  className="flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#145530]"
                >
                  <ShieldCheck size={16} /> Verify Me
                </button>
              )}
            </>
          )}

          {step === "verifying" && (
            <span className="flex items-center gap-2 rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-600">
              <Loader2 size={16} className="animate-spin" /> Verifying...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
