"use client";

import type { RefObject } from "react";
import { CameraOff, Loader2, VideoOff } from "lucide-react";
import type { CameraStatus } from "@/app/components/useCamera";

type CameraPreviewProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  status: CameraStatus;
  error?: string;
  className?: string;
};

// Live camera preview bound to the useCamera hook. Renders friendly fallback
// states for permission-denied / missing / disconnected cameras.
export default function CameraPreview({
  videoRef,
  status,
  error,
  className = "",
}: CameraPreviewProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gray-900 ${className}`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`h-full w-full -scale-x-100 object-cover ${
          status === "active" ? "" : "invisible"
        }`}
      />

      {status !== "active" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center text-gray-300">
          {status === "starting" ? (
            <>
              <Loader2 size={28} className="animate-spin" />
              <p className="text-sm">Starting camera...</p>
            </>
          ) : status === "denied" || status === "unavailable" ? (
            <>
              <CameraOff size={28} />
              <p className="text-sm">{error || "Camera is not available."}</p>
            </>
          ) : status === "ended" ? (
            <>
              <VideoOff size={28} />
              <p className="text-sm">
                {error || "The camera was disconnected."}
              </p>
            </>
          ) : (
            <>
              <CameraOff size={28} />
              <p className="text-sm">Camera is off.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
