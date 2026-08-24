"use client";

import type { ActivityContentType } from "@/app/lib/training-types";

type ActivityContentInputProps = {
  contentType: ActivityContentType;
  contentUrl: string;
  textContent: string;
  onContentUrlChange: (value: string) => void;
  onTextContentChange: (value: string) => void;
  disabled?: boolean;
};

const URL_PLACEHOLDERS: Partial<Record<ActivityContentType, string>> = {
  VIDEO: "https://... (video file URL)",
  PDF: "https://... (PDF file URL)",
  PPT: "https://... (slides file URL)",
  AUDIO: "https://... (audio file URL)",
  EXTERNAL: "https://... (external website to visit)",
};

const URL_HINTS: Partial<Record<ActivityContentType, string>> = {
  VIDEO: "Staff will watch this video inside the portal.",
  PDF: "Staff will read this document inside the portal.",
  PPT: "Staff will open these slides in a new tab.",
  AUDIO: "Staff will listen to this recording inside the portal.",
  EXTERNAL: "Staff will open this website in a new tab.",
};

// Renders the correct content field for the selected Activity type
// (PDF spec section 5): URL field for Video / PDF / Audio / External Link,
// rich text area for Text.
export default function ActivityContentInput({
  contentType,
  contentUrl,
  textContent,
  onContentUrlChange,
  onTextContentChange,
  disabled,
}: ActivityContentInputProps) {
  if (contentType === "TEXT") {
    return (
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Text content
        </label>
        <textarea
          value={textContent}
          onChange={(event) => onTextContentChange(event.target.value)}
          disabled={disabled}
          rows={8}
          placeholder="Write the article or explanation staff will read..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] disabled:bg-gray-50"
        />
        <p className="mt-1 text-xs text-gray-500">
          Staff will read this text directly inside the portal.
        </p>
      </div>
    );
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Content URL
      </label>
      <input
        type="url"
        value={contentUrl}
        onChange={(event) => onContentUrlChange(event.target.value)}
        disabled={disabled}
        placeholder={URL_PLACEHOLDERS[contentType]}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] disabled:bg-gray-50"
      />
      <p className="mt-1 text-xs text-gray-500">{URL_HINTS[contentType]}</p>
    </div>
  );
}
