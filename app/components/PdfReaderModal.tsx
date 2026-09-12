"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";

// Loaded only when a document is actually opened. pdf.js is around a megabyte,
// and most visits to a page that can open one never do.
const PdfViewer = dynamic(() => import("@/app/components/PdfViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100vh-11rem)] items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-500">
      Loading document...
    </div>
  ),
});

type PdfReaderModalProps = {
  url: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
};

/**
 * Reads a PDF without leaving the portal.
 *
 * Opening one in a new tab works on a desktop and does not on a phone, where
 * the browser has no reader of its own and offers a filename and a download
 * instead. Keeping it here means the document is readable on any device, and
 * the reader stays a click from what they were doing.
 */
export default function PdfReaderModal({
  url,
  title,
  subtitle,
  onClose,
}: PdfReaderModalProps) {
  // Escape closes it, and the page behind must not scroll while it is open —
  // on a phone, two scrolling surfaces fight each other.
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex flex-col bg-black/70 p-2 sm:p-4"
    >
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-3 sm:p-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-gray-800">
              {title}
            </h3>
            {subtitle && (
              <p className="truncate text-xs text-gray-500">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <PdfViewer url={url} title={title} className="h-[calc(100vh-11rem)]" />
        </div>
      </div>
    </div>
  );
}
