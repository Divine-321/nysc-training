"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Download, ExternalLink, X } from "lucide-react";
import { manualDownloadName, type Manual } from "@/app/lib/manuals";

const DISMISS_KEY = "nysc-manual-prompt-dismissed";
// Bump when the manuals change materially, so a user who ticked "don't show
// again" is offered the new version once.
const PROMPT_VERSION = "1";
const APPEAR_DELAY_MS = 1500;

type ManualPromptProps = {
  manuals: Manual[];
  title?: string;
  description?: string;
};

// A deliberately non-blocking nudge toward the portal manuals: it slides into
// the bottom corner after the page has settled, sits outside the form, has no
// backdrop and never takes focus. The form stays fully usable with the prompt
// on screen — closing it is optional, not a gate.
export default function ManualPrompt({
  manuals,
  title = "New to the portal?",
  description = "Short guides on how to register, log in and find your way around.",
}: ManualPromptProps) {
  // "hidden" renders nothing; "entering" mounts the card off-screen so the
  // browser has a frame to transition from; "shown" slides it in; "leaving"
  // slides it out and is held just long enough for that transition to finish.
  const [phase, setPhase] = useState<
    "hidden" | "entering" | "shown" | "leaving"
  >("hidden");
  // Closing the prompt has to stick for the rest of the visit. The mount effect
  // re-runs when an async-loaded manual arrives, which would otherwise pop a
  // just-closed prompt straight back open.
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (manuals.length === 0) return;
    if (dismissedRef.current) return;
    if (window.localStorage.getItem(DISMISS_KEY) === PROMPT_VERSION) return;

    const timer = window.setTimeout(() => setPhase("entering"), APPEAR_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [manuals.length]);

  useEffect(() => {
    if (phase !== "entering") return;

    const frame = window.requestAnimationFrame(() => setPhase("shown"));

    return () => window.cancelAnimationFrame(frame);
  }, [phase]);

  const dismiss = (permanently: boolean) => {
    if (permanently) {
      window.localStorage.setItem(DISMISS_KEY, PROMPT_VERSION);
    }
    dismissedRef.current = true;
    setPhase("leaving");
    // Let the slide-out finish before unmounting.
    window.setTimeout(() => setPhase("hidden"), 300);
  };

  if (phase === "hidden") return null;

  const visible = phase === "shown";

  return (
    <div
      role="complementary"
      aria-label="Portal manuals"
      className={`fixed inset-x-4 bottom-4 z-40 sm:left-auto sm:right-6 sm:bottom-6 sm:w-80 transition-all duration-300 ease-out ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xl shadow-black/10">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-50 text-nysc-green">
              <BookOpen size={16} />
            </div>
            <h3 className="text-sm font-bold text-gray-800">{title}</h3>
          </div>
          <button
            type="button"
            onClick={() => dismiss(false)}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mb-3 text-xs leading-relaxed text-gray-500">
          {description}
        </p>

        <div className="space-y-2">
          {manuals.map((manual) => (
            <div
              key={manual.id}
              className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/60 p-2"
            >
              <a
                href={manual.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center gap-1.5 truncate text-xs font-semibold text-nysc-green hover:underline"
              >
                <ExternalLink size={13} className="shrink-0" />
                <span className="truncate">{manual.title}</span>
              </a>
              <a
                href={manual.href}
                download={manualDownloadName(manual)}
                aria-label={`Download ${manual.title}`}
                title={`Download ${manual.title}`}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-white hover:text-nysc-green"
              >
                <Download size={14} />
              </a>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => dismiss(true)}
          className="mt-3 w-full text-center text-[11px] font-medium text-gray-400 transition hover:text-gray-600"
        >
          Don&apos;t show this again
        </button>
      </div>
    </div>
  );
}
