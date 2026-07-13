import {
  AlignLeft,
  AudioLines,
  ClipboardList,
  FileText,
  Link2,
  Presentation,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { ActivityContentType } from "@/app/lib/training-types";

/**
 * One place for how each activity content type looks across the admin —
 * icon, label and tint. Matches the backend ContentTypeEnum exactly:
 * VIDEO | PDF | PPT | TEXT | AUDIO | EXTERNAL | ASSESSMENT.
 */
export const ACTIVITY_TYPE_META: Record<
  ActivityContentType,
  { label: string; icon: LucideIcon; tint: string }
> = {
  VIDEO: { label: "Video", icon: Video, tint: "bg-blue-50 text-blue-600" },
  PDF: { label: "PDF", icon: FileText, tint: "bg-red-50 text-red-600" },
  PPT: {
    label: "Slides",
    icon: Presentation,
    tint: "bg-orange-50 text-orange-600",
  },
  AUDIO: {
    label: "Audio",
    icon: AudioLines,
    tint: "bg-purple-50 text-purple-600",
  },
  EXTERNAL: {
    label: "External link",
    icon: Link2,
    tint: "bg-sky-50 text-sky-600",
  },
  TEXT: { label: "Text lesson", icon: AlignLeft, tint: "bg-gray-100 text-gray-600" },
  ASSESSMENT: {
    label: "Assessment",
    icon: ClipboardList,
    tint: "bg-green-50 text-[#1a6b3c]",
  },
};

export function activityTypeMeta(type: ActivityContentType | string) {
  return (
    ACTIVITY_TYPE_META[type as ActivityContentType] ?? ACTIVITY_TYPE_META.TEXT
  );
}
