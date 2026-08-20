"use client";

import { ExternalLink, FileText } from "lucide-react";
import RichTextViewer from "@/app/components/RichTextViewer";
import type { Activity } from "@/app/lib/training-types";

type ActivityViewerProps = {
  activity: Pick<Activity, "title" | "content_type" | "content_url" | "text_content">;
};

// Renders one Activity's learning content by its content type (PDF spec
// section 5): Video, PDF, Text, Audio, External Link. This is the staff-side
// viewer for the new Course -> Module -> Activity model; it will replace the
// old ModuleActivity preview once the Activities API ships.
export default function ActivityViewer({ activity }: ActivityViewerProps) {
  if (activity.content_type === "VIDEO") {
    return (
      <video
        controls
        src={activity.content_url ?? undefined}
        className="aspect-video w-full rounded-xl bg-black"
      />
    );
  }

  if (activity.content_type === "PDF") {
    return (
      <iframe
        src={activity.content_url ?? undefined}
        title={activity.title}
        className="w-full rounded-xl border border-gray-200"
        style={{ height: "75vh" }}
      />
    );
  }

  if (activity.content_type === "AUDIO") {
    return (
      <audio controls src={activity.content_url ?? undefined} className="w-full">
        Your browser does not support this audio file.
      </audio>
    );
  }

  if (activity.content_type === "ASSESSMENT") {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
        <FileText size={26} className="mx-auto mb-3 text-[#1a6b3c]" />
        This activity opens a proctored assessment. Staff take it from this
        point in the module flow inside the course player.
      </div>
    );
  }

  if (
    activity.content_type === "EXTERNAL" ||
    activity.content_type === "PPT"
  ) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
        <ExternalLink size={28} className="mx-auto mb-3 text-[#1a6b3c]" />
        <p className="mb-4 text-sm text-gray-600">
          This activity is an external learning resource that opens in a new
          tab.
        </p>
        <a
          href={activity.content_url ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#145530]"
        >
          <ExternalLink size={16} /> Open Resource
        </a>
      </div>
    );
  }

  // TEXT — admin-authored rich lesson content (sanitized before rendering).
  if (activity.text_content) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <RichTextViewer html={activity.text_content} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
      <FileText size={24} className="mx-auto mb-2 text-gray-400" />
      This activity has no content yet.
    </div>
  );
}
