"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Catches a crash anywhere in the admin portal.
 *
 * React unmounts the whole tree when a component throws while rendering, so
 * without this a single malformed record blanks the entire page — which is
 * exactly what one certificate with no course title did. The sidebar and
 * header live in the layout above this file, so they survive: the admin can
 * read the message and navigate away instead of being stranded on a white
 * screen.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Next strips the message from production builds and leaves a digest, so
    // the console is the only place the real cause survives. Worth having when
    // someone reports "it just went blank".
    console.error("Admin page error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <AlertTriangle size={26} />
      </div>

      <h2 className="text-xl font-bold text-gray-800">
        This page could not be displayed
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500">
        Something in the data for this screen was not what the page expected.
        The rest of the portal is unaffected — you can try again or move on.
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
          href="/admin/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#1a6b3c] px-6 py-2.5 text-sm font-semibold text-[#1a6b3c] transition hover:bg-green-50"
        >
          Back to dashboard
        </Link>
      </div>

      {/* The digest is the only handle on the failure in a production build,
          so it is shown rather than hidden — it is what makes a report
          actionable instead of "a page broke". */}
      {error.digest && (
        <p className="mt-6 text-xs text-gray-400">
          Reference: <span className="font-mono">{error.digest}</span>
        </p>
      )}
    </div>
  );
}
