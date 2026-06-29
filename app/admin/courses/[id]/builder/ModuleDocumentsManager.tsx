"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { ExternalLink, FileUp, Trash2 } from "lucide-react";
import { extractErrorMessage } from "@/app/lib/portal-api";
import { uploadFileToCloudinary } from "@/app/lib/cloudinary-upload";
import { useConfirm } from "@/app/components/useConfirm";

export type ModuleDocument = {
  id: number;
  module: number;
  title: string;
  doc_type: "VIDEO" | "PDF" | "PPT" | "IMAGE" | "OTHER";
  file_url: string;
  cloudinary_public_id: string | null;
  order: number;
};

type ModuleDocumentsManagerProps = {
  moduleId: number;
  documents: ModuleDocument[];
  onChanged: () => Promise<void>;
};

function inferDocumentType(file: File): ModuleDocument["doc_type"] {
  const filename = file.name.toLowerCase();

  if (file.type.startsWith("video/")) return "VIDEO";
  if (file.type.startsWith("image/")) return "IMAGE";
  if (file.type === "application/pdf" || filename.endsWith(".pdf")) {
    return "PDF";
  }
  if (filename.endsWith(".ppt") || filename.endsWith(".pptx")) {
    return "PPT";
  }

  return "OTHER";
}

function filenameWithoutExtension(filename: string) {
  return filename.replace(/\.[^/.]+$/, "");
}

export default function ModuleDocumentsManager({
  moduleId,
  documents,
  onChanged,
}: ModuleDocumentsManagerProps) {
  const { confirm, dialog } = useConfirm();
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] =
    useState<ModuleDocument["doc_type"]>("VIDEO");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setError("Please select a file.");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a document title.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError("");
    setNotice("");

    try {
      const uploadedFile = await uploadFileToCloudinary(file, setProgress);

      const response = await fetch("/api/training/module-docs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          module: moduleId,
          title: title.trim(),
          doc_type: documentType,
          file_url: uploadedFile.secure_url,
          cloudinary_public_id: uploadedFile.public_id,
          order: documents.length,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(
            payload,
            "The file uploaded, but its module record could not be saved.",
          ),
        );
      }

      setTitle("");
      setFile(null);
      setProgress(0);
      setFileInputKey((current) => current + 1);
      setNotice("Module material uploaded successfully.");
      await onChanged();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload the module material.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (document: ModuleDocument) => {
    const confirmed = await confirm(
      `Delete "${document.title}" from this module and Cloudinary?`,
      { danger: true },
    );

    if (!confirmed) return;

    setDeletingId(document.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/training/module-docs/${document.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          extractErrorMessage(payload, "Could not delete this material."),
        );
      }

      setNotice("Module material deleted successfully.");
      await onChanged();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete this material.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
      <div>
        <p className="text-sm font-semibold text-gray-700">Module materials</p>
        <p className="text-xs text-gray-500">
          Upload videos, audio, PDFs, presentations or images after creating the
          module.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-lg bg-green-50 p-3 text-xs text-green-700">
          {notice}
        </div>
      )}

      {documents.length > 0 && (
        <ul className="space-y-2">
          {documents
            .slice()
            .sort((first, second) => first.order - second.order)
            .map((document) => (
              <li
                key={document.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">
                    {document.title}
                  </p>
                  <p className="text-xs text-gray-500">{document.doc_type}</p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <a
                    href={document.file_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${document.title}`}
                    className="text-[#1a6b3c]"
                  >
                    <ExternalLink size={16} />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleDelete(document)}
                    disabled={deletingId === document.id}
                    aria-label={`Delete ${document.title}`}
                    className="text-red-600 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
        </ul>
      )}

      <form onSubmit={handleUpload} className="grid gap-3 sm:grid-cols-2">
        <input
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Material title"
          className="rounded-lg border px-3 py-2 text-sm"
        />

        <select
          value={documentType}
          onChange={(event) =>
            setDocumentType(event.target.value as ModuleDocument["doc_type"])
          }
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="VIDEO">Video</option>
          <option value="PDF">PDF</option>
          <option value="PPT">Presentation</option>
          <option value="IMAGE">Image</option>
          <option value="OTHER">Audio/Other</option>
        </select>

        <input
          key={fileInputKey}
          required
          type="file"
          accept="video/*,audio/*,.pdf,.ppt,.pptx,image/*"
          onChange={(event) => {
            const selectedFile = event.target.files?.[0] ?? null;
            setFile(selectedFile);

            if (selectedFile) {
              setDocumentType(inferDocumentType(selectedFile));
              setTitle((current) =>
                current || filenameWithoutExtension(selectedFile.name),
              );
            }
          }}
          className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"
        />

        {uploading && (
          <div className="sm:col-span-2">
            <div className="mb-1 flex justify-between text-xs text-gray-500">
              <span>Uploading directly to Cloudinary...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-[#1a6b3c] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <button
          disabled={uploading}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#1a6b3c] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2"
        >
          <FileUp size={17} />
          {uploading ? "Uploading..." : "Upload material"}
        </button>
      </form>

      {dialog}
    </div>
  );
}
