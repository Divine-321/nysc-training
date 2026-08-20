"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Maximize2,
  Minimize2,
  ShieldCheck,
} from "lucide-react";
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
/**
 * The learner's saved widget placement, or the defaults.
 *
 * Reads storage directly rather than through state so the first paint is
 * already correct. Any failure — storage disabled, malformed JSON — falls
 * back to the defaults, since a misplaced preview is a nuisance, not a fault
 * worth surfacing mid-exam.
 */
function savedPreferences(): { collapsed: boolean; side: "left" | "right" } {
  const defaults = { collapsed: false, side: "left" as const };

  try {
    const saved = window.localStorage.getItem("proctoring-widget");
    if (!saved) return defaults;

    const prefs = JSON.parse(saved) as {
      collapsed?: boolean;
      side?: "left" | "right";
    };

    return {
      collapsed:
        typeof prefs.collapsed === "boolean" ? prefs.collapsed : defaults.collapsed,
      side: prefs.side === "left" || prefs.side === "right" ? prefs.side : defaults.side,
    };
  } catch {
    return defaults;
  }
}

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
  // The learner can shrink the preview and dock it to either corner so it never
  // covers the questions. The camera keeps running the whole time — only the
  // on-screen preview changes — so monitoring is unaffected.
  //
  // Both are seeded straight from storage rather than defaulted and then
  // corrected in an effect, which rendered the widget in the wrong corner for
  // a frame before moving it. Reading during render is safe here because this
  // only mounts once an attempt is under way, so it is never server-rendered
  // and there is no hydration pass to disagree with.
  const [collapsed, setCollapsed] = useState(() => savedPreferences().collapsed);
  // Defaults to the LEFT corner — the assessment's questions and navigator sit
  // on the right, so a right-docked preview would cover them.
  const [side, setSide] = useState<"left" | "right">(
    () => savedPreferences().side,
  );
  const warningTimerRef = useRef<number | null>(null);
  const wasFullscreenRef = useRef(false);
  const lastEventFrameAtRef = useRef(0);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "proctoring-widget",
        JSON.stringify({ collapsed, side }),
      );
    } catch {
      // Non-fatal — preference just won't persist.
    }
  }, [collapsed, side]);

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
    <div
      className={`pointer-events-none fixed bottom-4 z-40 flex flex-col gap-2 ${
        side === "left" ? "left-4 items-start" : "right-4 items-end"
      }`}
    >
      {warning && (
        <div className="pointer-events-auto flex w-56 items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800 shadow-lg">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>{warning}</p>
        </div>
      )}

      <div
        className={`pointer-events-auto overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg ${
          collapsed ? "" : "w-56"
        }`}
      >
        {/* The video element stays mounted even when collapsed — frame capture
            reads the stream's intrinsic size, not the on-screen size, so
            monitoring continues regardless of this preview being visible. */}
        <div className={collapsed ? "h-0 w-0 overflow-hidden" : ""}>
          <CameraPreview
            videoRef={camera.videoRef}
            status={camera.status}
            error={camera.error}
            className="aspect-video w-full rounded-none"
          />
        </div>

        <div className="flex items-center gap-1.5 px-2 py-1.5">
          <ShieldCheck
            size={15}
            strokeWidth={2.5}
            className="shrink-0 text-[#1a6b3c]"
          />
          <span className="flex-1 truncate text-[11px] font-bold text-gray-600">
            Proctoring active
          </span>

          <button
            type="button"
            onClick={() =>
              setSide((current) => (current === "left" ? "right" : "left"))
            }
            title="Move to the other side"
            aria-label="Move camera to the other side"
            className="flex shrink-0 items-center justify-center rounded-md bg-gray-100 p-1.5 text-gray-700 transition hover:bg-gray-200"
          >
            <ArrowLeftRight size={16} strokeWidth={2.75} />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((current) => !current)}
            title={collapsed ? "Show camera preview" : "Hide camera preview"}
            aria-label={
              collapsed ? "Show camera preview" : "Hide camera preview"
            }
            className="flex shrink-0 items-center gap-1 rounded-md bg-gray-100 px-2 py-1.5 text-[11px] font-bold text-gray-700 transition hover:bg-gray-200"
          >
            {collapsed ? (
              <>
                <Maximize2 size={16} strokeWidth={2.75} /> Show
              </>
            ) : (
              <>
                <Minimize2 size={16} strokeWidth={2.75} /> Hide
              </>
            )}
          </button>
        </div>

        {!collapsed && (
          <p className="px-2.5 pb-2 text-[10px] font-medium leading-tight text-gray-400">
            Stay visible on camera · use Hide/Move if it covers anything
          </p>
        )}
      </div>
    </div>
  );
}
