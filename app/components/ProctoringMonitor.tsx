"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import CameraPreview from "@/app/components/CameraPreview";
import { useCamera } from "@/app/components/useCamera";
import {
  reportBrowserEvent,
  sendProctoringFrame,
} from "@/app/lib/proctoring";
import type { ProctoringEventType } from "@/app/lib/training-types";

type ProctoringMonitorProps = {
  sessionId: number;
  /** How often a monitoring frame is captured and uploaded. */
  frameIntervalMs?: number;
};

const WARNING_TEXT: Partial<Record<ProctoringEventType, string>> = {
  NO_FACE: "No face detected. Please stay in front of the camera.",
  MULTIPLE_FACES: "More than one face detected. You must take this test alone.",
  IDENTITY_MISMATCH: "Your face does not match the registered photo.",
  SUSPICIOUS_MOUTH: "Please do not talk during the assessment.",
  CAMERA_DISABLED: "Your camera was turned off. Reconnect it to continue.",
  TAB_SWITCH: "Leaving this tab is recorded and may flag your attempt.",
  WINDOW_BLUR: "Switching windows is recorded and may flag your attempt.",
  FULLSCREEN_EXIT: "Exiting fullscreen is recorded and may flag your attempt.",
};

const WARNING_DISMISS_MS = 6000;

// Rekognition analysis is billed per frame, so the periodic heartbeat runs
// every 3 minutes and suspicious moments are covered by an immediate
// event-triggered frame instead (backend cost request, 2026-07-10).
const DEFAULT_FRAME_INTERVAL_MS = 180000;
const EVENT_FRAME_MIN_GAP_MS = 15000;

// Runs while an assessment attempt is in progress (PDF sections 15-17):
// keeps the camera on, uploads a frame every interval, reports browser events
// (tab switch, window blur, fullscreen exit, camera loss), and warns the staff
// member when monitoring conditions are not satisfied. Monitoring failures
// never interrupt the exam itself.
export default function ProctoringMonitor({
  sessionId,
  frameIntervalMs = DEFAULT_FRAME_INTERVAL_MS,
}: ProctoringMonitorProps) {
  const camera = useCamera({
    onCameraLost: () => {
      reportEvent("CAMERA_DISABLED");
    },
  });

  const [warning, setWarning] = useState<string | null>(null);
  const warningTimerRef = useRef<number | null>(null);
  const wasFullscreenRef = useRef(false);
  const lastEventFrameAtRef = useRef(0);

  const showWarning = (eventType: ProctoringEventType) => {
    const text = WARNING_TEXT[eventType];
    if (!text) return;

    setWarning(text);

    if (warningTimerRef.current) {
      window.clearTimeout(warningTimerRef.current);
    }
    warningTimerRef.current = window.setTimeout(
      () => setWarning(null),
      WARNING_DISMISS_MS,
    );
  };

  // Reports a browser event and attaches an evidence frame right away, so the
  // slow heartbeat never misses the moment that mattered. Bursts (blur + tab
  // switch firing together) share a single frame via the throttle.
  const reportEvent = (
    eventType: "CAMERA_DISABLED" | "FULLSCREEN_EXIT" | "TAB_SWITCH" | "WINDOW_BLUR",
  ) => {
    void reportBrowserEvent(sessionId, eventType);
    showWarning(eventType);

    const now = Date.now();
    if (now - lastEventFrameAtRef.current < EVENT_FRAME_MIN_GAP_MS) return;

    const frame = camera.captureFrame();
    if (!frame) return;

    lastEventFrameAtRef.current = now;
    void sendProctoringFrame(sessionId, frame).then(({ eventsDetected }) => {
      eventsDetected.forEach(showWarning);
    });
  };

  // Keep the camera on and upload a monitoring frame on every tick.
  useEffect(() => {
    void camera.start();

    const timer = window.setInterval(async () => {
      const frame = camera.captureFrame();

      if (!frame) return;

      const { eventsDetected } = await sendProctoringFrame(sessionId, frame);
      eventsDetected.forEach(showWarning);
    }, frameIntervalMs);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, frameIntervalMs]);

  // Browser-detected events: tab switch, window blur, fullscreen exit.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        reportEvent("TAB_SWITCH");
      }
    };

    const handleBlur = () => {
      // Tab switches already fire visibilitychange; only report real
      // window-level focus loss while the tab stays visible.
      if (!document.hidden) {
        reportEvent("WINDOW_BLUR");
      }
    };

    const handleFullscreen = () => {
      if (document.fullscreenElement) {
        wasFullscreenRef.current = true;
      } else if (wasFullscreenRef.current) {
        wasFullscreenRef.current = false;
        reportEvent("FULLSCREEN_EXIT");
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreen);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreen);
      if (warningTimerRef.current) {
        window.clearTimeout(warningTimerRef.current);
      }
    };
    // reportEvent only closes over sessionId (a dep) and stable camera fns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 flex w-56 flex-col gap-2">
      {warning && (
        <div className="pointer-events-auto flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800 shadow-lg">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>{warning}</p>
        </div>
      )}

      <div className="pointer-events-auto overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
        <CameraPreview
          videoRef={camera.videoRef}
          status={camera.status}
          error={camera.error}
          className="aspect-video w-full rounded-none"
        />
        <div className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-gray-500">
          <ShieldCheck size={13} className="text-[#1a6b3c]" />
          Proctoring active — stay visible on camera
        </div>
      </div>
    </div>
  );
}
