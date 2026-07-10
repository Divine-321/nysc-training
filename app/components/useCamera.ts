"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus =
  | "idle"
  | "starting"
  | "active"
  | "denied"
  | "unavailable"
  | "ended";

type UseCameraOptions = {
  /** Called when the camera stops unexpectedly (unplugged, permission revoked). */
  onCameraLost?: () => void;
};

// Captured frames are downscaled before upload so periodic proctoring frames
// stay small (~30-60 KB) instead of shipping full-resolution camera images.
const MAX_CAPTURE_WIDTH = 640;
const CAPTURE_QUALITY = 0.7;

export function useCamera(options: UseCameraOptions = {}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onCameraLostRef = useRef(options.onCameraLost);

  useEffect(() => {
    onCameraLostRef.current = options.onCameraLost;
  }, [options.onCameraLost]);

  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState("");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStatus((current) => (current === "active" ? "idle" : current));
  }, []);

  const start = useCallback(async () => {
    if (streamRef.current) return true;

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setStatus("unavailable");
      setError(
        "Camera access is not supported in this browser. Please use an up-to-date browser over HTTPS.",
      );
      return false;
    }

    setStatus("starting");
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 } },
        audio: false,
      });

      streamRef.current = stream;

      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          streamRef.current = null;
          setStatus("ended");
          setError("The camera was turned off or disconnected.");
          onCameraLostRef.current?.();
        };
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }

      setStatus("active");
      return true;
    } catch (startError) {
      const isDenied =
        startError instanceof DOMException &&
        (startError.name === "NotAllowedError" ||
          startError.name === "SecurityError");

      setStatus(isDenied ? "denied" : "unavailable");
      setError(
        isDenied
          ? "Camera permission was denied. Please allow camera access and try again."
          : "No usable camera was found on this device.",
      );
      return false;
    }
  }, []);

  /**
   * Captures the current video frame as a base64 JPEG data URL, downscaled to
   * keep uploads small. Returns null if the camera is not running yet.
   */
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;

    if (!video || !streamRef.current || video.videoWidth === 0) return null;

    const scale = Math.min(1, MAX_CAPTURE_WIDTH / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", CAPTURE_QUALITY);
  }, []);

  useEffect(() => stop, [stop]);

  return { videoRef, status, error, start, stop, captureFrame };
}
