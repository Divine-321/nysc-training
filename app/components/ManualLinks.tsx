"use client";

import { BookOpen } from "lucide-react";
import type { Manual } from "@/app/lib/manuals";

type ManualLinksProps = {
  manuals: Manual[];
  label?: string;
  className?: string;
};

// A quiet inline row of manual links, e.g. "Need help? Staff Guide · Admin
// Guide". Opens each PDF in a new tab so the browser's own viewer handles
// reading and downloading — nothing here interrupts the form it sits under.
export default function ManualLinks({
  manuals,
  label = "Need help?",
  className = "",
}: ManualLinksProps) {
  if (manuals.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-gray-500 ${className}`}
    >
      <span className="flex items-center gap-1.5">
        <BookOpen size={14} className="text-gray-400" />
        {label}
      </span>

      {manuals.map((manual, index) => (
        <span key={manual.id} className="flex items-center gap-2">
          {index > 0 && <span className="text-gray-300">·</span>}
          <a
            href={manual.href}
            target="_blank"
            rel="noopener noreferrer"
            title={manual.description}
            className="font-semibold text-nysc-green hover:underline"
          >
            {manual.title}
          </a>
        </span>
      ))}
    </div>
  );
}
