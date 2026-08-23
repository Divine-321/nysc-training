"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Catches a crash anywhere in the staff portal.
 *
 * Worded for a learner rather than an administrator: they cannot fix data, so
 * the message says what to do next and reassures them their progress is safe
 * — which it is, since progress lives on the server and a render failure here
 * cannot have lost any of it.
 */
export default function StaffError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Staff page error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <AlertTriangle size={26} />
      </div>

      <h2 className="text-xl font-bold text-gray-800">
        Sorry — this page did not load
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500">
        Something went wrong displaying this page. Your progress and
        certificates are safe. Try again, or go back to your dashboard.
      </p>

      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a6b3c] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#145530]"
        >
          <RotateCcw size={16} /> Try again
        </button>
        <Link
          href="/staff/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#1a6b3c] px-6 py-2.5 text-sm font-semibold text-[#1a6b3c] transition hover:bg-green-50"
        >
          Back to dashboard
        </Link>
      </div>

      {error.digest && (
        <p className="mt-6 text-xs text-gray-400">
          Reference: <span className="font-mono">{error.digest}</span>
        </p>
      )}
    </div>
  );
}
