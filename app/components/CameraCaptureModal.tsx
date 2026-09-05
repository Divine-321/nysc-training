"use client";

import { useEffect, useState } from "react";
import { Camera, Check, RefreshCcw, X } from "lucide-react";
import CameraPreview from "@/app/components/CameraPreview";
import { useCamera } from "@/app/components/useCamera";

type CameraCaptureModalProps = {
  title?: string;
  description?: string;
  /** Called with the captured image as a base64 JPEG data URL. */
  onCapture: (imageDataUrl: string) => void | Promise<void>;
  onCancel: () => void;
  busy?: boolean;
};

/** Converts a base64 data URL into a File for multipart uploads. */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], filename, { type: mime });
}

// Unlike a proctoring frame (small, sent every few seconds during an exam),
// this is captured once and then shown large — the profile card and the
// header avatar — so it's worth the extra bytes of a sharper capture instead
// of useCamera's bandwidth-optimised defaults.
const PROFILE_PHOTO_MAX_WIDTH = 1280;
const PROFILE_PHOTO_QUALITY = 0.92;

// Profile photos must be taken live with the camera (no device uploads):
// the registered photo is what AWS Rekognition compares exam takers against,
// so it has to be a real capture of the account owner.
export default function CameraCaptureModal({
  title = "Take a photo",
  description = "Position your face in the frame and capture.",
  onCapture,
  onCancel,
  busy = false,
}: CameraCaptureModalProps) {
  const camera = useCamera();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    void camera.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = () => {
    const frame = camera.captureFrame({
      maxWidth: PROFILE_PHOTO_MAX_WIDTH,
      quality: PROFILE_PHOTO_QUALITY,
    });
    if (frame) setCapturedImage(frame);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    void camera.start();
  };

  const handleUse = async () => {
    if (!capturedImage) return;
    await onCapture(capturedImage);
  };

  const handleCancel = () => {
    camera.stop();
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-4">
      <div className="my-auto max-h-[95vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            disabled={busy}
            aria-label="Close"
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {capturedImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={capturedImage}
            alt="Captured"
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

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          {!capturedImage ? (
            <button
              type="button"
              onClick={handleCapture}
              disabled={camera.status !== "active"}
              className="flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#145530] disabled:opacity-50"
            >
              <Camera size={16} /> Capture
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleRetake}
                disabled={busy}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCcw size={16} /> Retake
              </button>
              <button
                type="button"
                onClick={handleUse}
                disabled={busy}
                className="flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#145530] disabled:opacity-60"
              >
                <Check size={16} />
                {busy ? "Saving..." : "Use this photo"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
