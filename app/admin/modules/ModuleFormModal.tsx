"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { ImageUp, Save } from "lucide-react";
import { Modal } from "@/app/components/ui-interactive";
import { btn, field, fieldLabel } from "@/app/components/ui";
import {
  extractErrorMessage,
  readApiItem,
  type LibraryModule,
} from "@/app/lib/portal-api";
import { uploadFileToCloudinary } from "@/app/lib/cloudinary-upload";

/**
 * Create / edit a reusable library module. Render conditionally — the form
 * state is seeded from the `module` prop on mount. Backend fields only:
 * title, description, thumbnail_url, cloudinary_public_id.
 *
 * TODO(backend): add `estimated_duration` here once the Module serializer
 * supports it — the field does not exist on the backend yet.
 */
export default function ModuleFormModal({
  module: editingModule,
  onClose,
  onSaved,
}: {
  module: LibraryModule | null;
  onClose: () => void;
  onSaved: (
    module: LibraryModule | null,
    message: string,
  ) => void | Promise<void>;
}) {
  const [title, setTitle] = useState(editingModule?.title ?? "");
  const [description, setDescription] = useState(
    editingModule?.description ?? "",
  );
  const [thumbnailUrl, setThumbnailUrl] = useState(
    editingModule?.thumbnail_url ?? "",
  );
  const [thumbnailPublicId, setThumbnailPublicId] = useState(
    editingModule?.cloudinary_public_id ?? "",
  );
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEditing = editingModule !== null;

  const handleThumbnail = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file for the thumbnail.");
      return;
    }

    setError("");
    setUploading(true);
    setProgress(0);

    try {
      const uploaded = await uploadFileToCloudinary(
        file,
        setProgress,
        "module",
      );

      setThumbnailUrl(uploaded.secure_url);
      setThumbnailPublicId(uploaded.public_id);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload the thumbnail.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        isEditing
          ? `/api/training/modules/${editingModule.id}`
          : "/api/training/modules",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            thumbnail_url: thumbnailUrl || null,
            cloudinary_public_id: thumbnailPublicId || null,
          }),
        },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not save the module."),
        );
      }

      await onSaved(
        readApiItem<LibraryModule>(payload),
        isEditing ? "Module updated." : "Module created.",
      );
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save the module.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEditing ? "Edit Module" : "New Module"}
      subtitle={
        isEditing
          ? "Modules are shared — edits apply in every course using this module."
          : "Modules live in the shared library and can be attached to any course."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div>
          <label className={fieldLabel}>Module title</label>
          <input
            required
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="For example: Time Management"
            className={field}
          />
        </div>

        <div>
          <label className={fieldLabel}>Description</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What staff will learn in this module…"
            className={`${field} h-24 resize-none`}
          />
        </div>

        <div>
          <label className={fieldLabel}>Thumbnail</label>
          <label
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
              uploading
                ? "border-gray-200 bg-gray-50"
                : "border-gray-200 hover:border-[#1a6b3c]/50 hover:bg-[#f0f7f3]/50"
            }`}
          >
            <ImageUp size={20} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-600">
              {uploading
                ? `Uploading… ${progress}%`
                : thumbnailUrl
                  ? "Replace image"
                  : "Upload an image"}
            </span>
            <span className="text-xs text-gray-400">
              Shown on module cards and to staff
            </span>
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={handleThumbnail}
              className="sr-only"
            />
          </label>

          {uploading ? (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-[#1a6b3c] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : null}

          {thumbnailUrl && !uploading ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbnailUrl}
                alt="Module thumbnail preview"
                className="h-32 w-full object-cover"
              />
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={btn.secondary}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || uploading || !title.trim()}
            className={btn.primary}
          >
            <Save size={16} />
            {saving
              ? "Saving…"
              : isEditing
                ? "Save changes"
                : "Create module"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
