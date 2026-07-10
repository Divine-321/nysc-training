"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, Node, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TipTapImage from "@tiptap/extension-image";
import TipTapLink from "@tiptap/extension-link";
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Music,
  Quote,
  Redo2,
  Undo2,
  Video,
} from "lucide-react";
import { uploadFileToCloudinary } from "@/app/lib/cloudinary-upload";
import { RICH_TEXT_STYLES } from "@/app/components/RichTextViewer";

// Block-level <video>/<audio> embeds so a lesson can mix text with media
// inline. Rendered with controls both in the editor and for staff.
function createMediaBlock(name: string, tag: "video" | "audio") {
  return Node.create({
    name,
    group: "block",
    atom: true,
    draggable: true,
    addAttributes() {
      return { src: { default: null } };
    },
    parseHTML() {
      return [{ tag }];
    },
    renderHTML({ HTMLAttributes }) {
      return [tag, { ...HTMLAttributes, controls: "controls" }];
    },
  });
}

const VideoBlock = createMediaBlock("videoBlock", "video");
const AudioBlock = createMediaBlock("audioBlock", "audio");

type UploadKind = "image" | "video" | "audio";

type RichTextEditorProps = {
  /** HTML string. */
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
};

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`rounded-md p-1.5 transition disabled:opacity-40 ${
        active
          ? "bg-[#1a6b3c] text-white"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  disabled,
}: RichTextEditorProps) {
  const [uploading, setUploading] = useState<UploadKind | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      TipTapImage,
      TipTapLink.configure({ openOnClick: false, autolink: true }),
      VideoBlock,
      AudioBlock,
    ],
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
    editorProps: {
      attributes: {
        class: "min-h-40 px-4 py-3 focus:outline-none",
      },
    },
  });

  // Adopt external value changes (e.g. the form switching to edit mode)
  // without looping on our own onChange updates.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", false);
    }
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  const insertMedia = async (file: File, kind: UploadKind) => {
    setUploading(kind);
    setProgress(0);
    setUploadError("");

    try {
      const uploaded = await uploadFileToCloudinary(file, setProgress);

      if (!editor) return;

      if (kind === "image") {
        editor.chain().focus().setImage({ src: uploaded.secure_url }).run();
      } else {
        editor
          .chain()
          .focus()
          .insertContent({
            type: kind === "video" ? "videoBlock" : "audioBlock",
            attrs: { src: uploaded.secure_url },
          })
          .run();
      }
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : `Could not upload the ${kind}.`,
      );
    } finally {
      setUploading(null);
    }
  };

  const handleFilePick =
    (kind: UploadKind) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (file) void insertMedia(file, kind);
    };

  const setLink = (current: Editor) => {
    const previous = current.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");

    if (url === null) return;

    if (url.trim() === "") {
      current.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    current
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  };

  if (!editor) {
    return (
      <div className="min-h-52 animate-pulse rounded-lg border border-gray-200 bg-gray-50" />
    );
  }

  const busy = Boolean(disabled) || uploading !== null;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white focus-within:border-[#1a6b3c] focus-within:ring-1 focus-within:ring-[#1a6b3c]">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-100 bg-gray-50/70 px-2 py-1.5">
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          disabled={busy}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          disabled={busy}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Heading"
          active={editor.isActive("heading", { level: 2 })}
          disabled={busy}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Subheading"
          active={editor.isActive("heading", { level: 3 })}
          disabled={busy}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 size={15} />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-gray-200" />

        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          disabled={busy}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          disabled={busy}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Quote"
          active={editor.isActive("blockquote")}
          disabled={busy}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Link"
          active={editor.isActive("link")}
          disabled={busy}
          onClick={() => setLink(editor)}
        >
          <LinkIcon size={15} />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-gray-200" />

        <ToolbarButton
          label="Insert image"
          disabled={busy}
          onClick={() => imageInputRef.current?.click()}
        >
          <ImagePlus size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Insert video"
          disabled={busy}
          onClick={() => videoInputRef.current?.click()}
        >
          <Video size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Insert audio"
          disabled={busy}
          onClick={() => audioInputRef.current?.click()}
        >
          <Music size={15} />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-gray-200" />

        <ToolbarButton
          label="Undo"
          disabled={busy || !editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          disabled={busy || !editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 size={15} />
        </ToolbarButton>
      </div>

      {uploading && (
        <div className="border-b border-gray-100 px-4 py-2">
          <div className="mb-1 flex justify-between text-xs text-gray-500">
            <span>Uploading {uploading} to Cloudinary...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-[#1a6b3c] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {uploadError && (
        <p className="border-b border-gray-100 bg-red-50 px-4 py-2 text-xs text-red-700">
          {uploadError}
        </p>
      )}

      <div className={RICH_TEXT_STYLES}>
        <EditorContent editor={editor} />
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleFilePick("image")}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        onChange={handleFilePick("video")}
        className="hidden"
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFilePick("audio")}
        className="hidden"
      />
    </div>
  );
}
