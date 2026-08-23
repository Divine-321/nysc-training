import Link from "next/link";
import { Compass } from "lucide-react";

/**
 * Shown for any address that does not exist — a typo, an old bookmark, a
 * stale link in an email.
 *
 * This one sits at the root, so it also covers signed-out visitors who cannot
 * be sent into the portal. It offers both entrances rather than guessing which
 * one the person wanted.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-[#1a6b3c]">
          <Compass size={30} />
        </div>

        <p className="text-sm font-bold uppercase tracking-widest text-gray-400">
          Page not found
        </p>
        <h1 className="mt-2 text-2xl font-bold text-gray-800">
          That address does not exist
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-gray-500">
          The link may be mistyped or out of date. Nothing has gone wrong with
          your account.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/staff/dashboard"
            className="inline-flex items-center justify-center rounded-xl bg-[#1a6b3c] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#145530]"
          >
            Staff dashboard
          </Link>
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center justify-center rounded-xl border-2 border-[#1a6b3c] px-6 py-2.5 text-sm font-semibold text-[#1a6b3c] transition hover:bg-green-50"
          >
            Admin dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
