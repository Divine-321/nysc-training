"use client";

import { useMemo } from "react";
import DOMPurify from "dompurify";

// Typography for rendered lesson HTML. Shared with RichTextEditor so authors
// see exactly what staff will see.
export const RICH_TEXT_STYLES = [
  "text-sm leading-relaxed text-gray-700 sm:text-base",
  "[&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-gray-800",
  "[&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-800",
  "[&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-gray-800",
  "[&_p]:my-3",
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6",
  "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6",
  "[&_li]:my-1",
  "[&_a]:font-medium [&_a]:text-[#1a6b3c] [&_a]:underline",
  "[&_strong]:font-bold [&_strong]:text-gray-800",
  "[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-[#1a6b3c]/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600",
  "[&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-xl",
  "[&_video]:my-4 [&_video]:aspect-video [&_video]:w-full [&_video]:rounded-xl [&_video]:bg-black",
  "[&_audio]:my-4 [&_audio]:w-full",
  "[&_hr]:my-6 [&_hr]:border-gray-200",
  "[&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em]",
  "[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-gray-900 [&_pre]:p-4 [&_pre]:text-gray-100 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
].join(" ");

const looksLikeHtml = (value: string) => /<[a-z][\s\S]*>/i.test(value);

type RichTextViewerProps = {
  html: string;
  className?: string;
};

// Renders admin-authored lesson content. Everything is sanitized before it
// touches the DOM; media tags are allowed so lessons can embed images, video
// and audio inline (NetAcad-style mixed pages).
export default function RichTextViewer({
  html,
  className = "",
}: RichTextViewerProps) {
  const clean = useMemo(() => {
    if (typeof window === "undefined") return "";

    return DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      ADD_TAGS: ["video", "audio", "source"],
      ADD_ATTR: ["controls", "src", "preload", "poster", "target", "rel"],
    });
  }, [html]);

  if (!looksLikeHtml(html)) {
    return (
      <div className={`whitespace-pre-wrap ${RICH_TEXT_STYLES} ${className}`}>
        {html}
      </div>
    );
  }

  return (
    <div
      className={`${RICH_TEXT_STYLES} ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
