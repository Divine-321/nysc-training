"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Check, ImageUp, Plus, Save, Search, UserCheck } from "lucide-react";
import { Modal } from "@/app/components/ui-interactive";
import { btn, field, fieldLabel } from "@/app/components/ui";
import {
  extractErrorMessage,
  readApiItem,
  readApiList,
  type LibraryModule,
  type Trainer,
} from "@/app/lib/portal-api";
import { uploadFileToCloudinary } from "@/app/lib/cloudinary-upload";
import { cachedFetchAll } from "@/app/lib/data-cache";

/**
 * Create / edit a reusable library module — the SINGLE place trainers are
 * assigned. Business rule: a module has exactly one trainer, which then
 * appears everywhere the module is used. Backend field is an M2M
 * (`trainer_ids`), so we send a one-element array (or empty to unassign).
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
  const [trainerId, setTrainerId] = useState<number | null>(
    editingModule?.trainers?.[0]?.id ?? null,
  );
  const [trainers, setTrainers] = useState<Trainer[]>(
    editingModule?.trainers ?? [],
  );
  const [trainerSearch, setTrainerSearch] = useState("");
  const [addTrainerOpen, setAddTrainerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEditing = editingModule !== null;

  // The trainer directory for the picker (merged over any trainer already on
  // the module so its name renders immediately).
  useEffect(() => {
    let active = true;

    const loadTrainers = async () => {
      try {
        const response = await cachedFetchAll("/api/training/trainers");

        if (!response.ok || !active) return;

        const payload = await response.json().catch(() => null);

        setTrainers((current) => {
          const known = new Set(current.map((trainer) => trainer.id));
          const extra = readApiList<Trainer>(payload).filter(
            (trainer) => !known.has(trainer.id),
          );
          return [...current, ...extra];
        });
      } catch {
        // Picker just stays limited to the module's existing trainer.
      }
    };

    void loadTrainers();

    return () => {
      active = false;
    };
  }, []);

  const filteredTrainers = useMemo(() => {
    const query = trainerSearch.trim().toLowerCase();
    const sorted = [...trainers].sort((first, second) =>
      first.full_name.localeCompare(second.full_name),
    );

    if (!query) return sorted;

    return sorted.filter((trainer) =>
      `${trainer.full_name} ${trainer.designation} ${trainer.organization}`
        .toLowerCase()
        .includes(query),
    );
  }, [trainers, trainerSearch]);

  const selectedTrainer = trainers.find((trainer) => trainer.id === trainerId);

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
        "activity",
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

  // Called when a trainer is created from the nested modal: add it to the
  // directory and select it for this module immediately.
  const handleTrainerCreated = (trainer: Trainer) => {
    setTrainers((current) =>
      current.some((item) => item.id === trainer.id)
        ? current
        : [...current, trainer],
    );
    setTrainerId(trainer.id);
    setTrainerSearch("");
    setAddTrainerOpen(false);
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
            // One trainer per module (empty array unassigns).
            trainer_ids: trainerId !== null ? [trainerId] : [],
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

        {/* Trainer — the module is the single source of truth. */}
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label className={`${fieldLabel} mb-0`}>Trainer</label>
            <button
              type="button"
              onClick={() => setAddTrainerOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#1a6b3c] transition hover:text-[#145530]"
            >
              <Plus size={13} /> Add New Trainer
            </button>
          </div>

          {selectedTrainer ? (
            <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-[#1a6b3c]/30 bg-[#f0f7f3] px-3 py-2.5">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#1a6b3c]">
                  <UserCheck size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-gray-900">
                    {selectedTrainer.full_name}
                  </span>
                  <span className="block truncate text-xs text-gray-500">
                    {[selectedTrainer.designation, selectedTrainer.organization]
                      .filter(Boolean)
                      .join(" • ") || "Trainer"}
                  </span>
                </span>
              </span>
              <button
                type="button"
                onClick={() => setTrainerId(null)}
                className="shrink-0 text-xs font-semibold text-gray-500 transition hover:text-red-600"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <div className="relative mb-2">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={trainerSearch}
                  onChange={(event) => setTrainerSearch(event.target.value)}
                  placeholder="Search or select a trainer…"
                  className={`${field} pl-9`}
                />
              </div>

              <div className="max-h-44 overflow-y-auto rounded-xl border border-gray-100">
                {filteredTrainers.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-gray-400">
                    {trainers.length === 0
                      ? "No trainers yet — add one above."
                      : "No trainers match your search."}
                  </div>
                ) : (
                  filteredTrainers.map((trainer) => (
                    <button
                      key={trainer.id}
                      type="button"
                      onClick={() => setTrainerId(trainer.id)}
                      className="flex w-full items-center gap-2.5 border-b border-gray-50 px-3 py-2.5 text-left transition last:border-b-0 hover:bg-gray-50"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f0f7f3] text-[#1a6b3c]">
                        <UserCheck size={13} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-gray-800">
                          {trainer.full_name}
                        </span>
                        <span className="block truncate text-xs text-gray-400">
                          {[trainer.designation, trainer.organization]
                            .filter(Boolean)
                            .join(" • ") || "Trainer"}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
              <p className="mt-1.5 text-xs text-gray-400">
                The trainer travels with this module into every course that
                uses it. Leave empty to assign later.
              </p>
            </>
          )}
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

      {addTrainerOpen ? (
        <AddTrainerModal
          onClose={() => setAddTrainerOpen(false)}
          onCreated={handleTrainerCreated}
        />
      ) : null}
    </Modal>
  );
}

/**
 * Create a trainer without leaving the Module Builder. On success the parent
 * adds it to the directory and selects it for the current module.
 */
function AddTrainerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (trainer: Trainer) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("Resource Person");
  const [organization, setOrganization] = useState("NYSC");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!fullName.trim()) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/training/trainers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          designation: designation.trim() || "Resource Person",
          organization: organization.trim() || "NYSC",
          bio: null,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not create the trainer."),
        );
      }

      const created = readApiItem<Trainer>(payload);

      if (!created) {
        throw new Error("The trainer was created but not returned.");
      }

      onCreated(created);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create the trainer.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Add New Trainer"
      subtitle="Create a trainer and assign them to this module in one step."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div>
          <label className={fieldLabel}>Full name</label>
          <input
            required
            autoFocus
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="For example: John Doe"
            className={field}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={fieldLabel}>Designation</label>
            <input
              value={designation}
              onChange={(event) => setDesignation(event.target.value)}
              className={field}
            />
          </div>
          <div>
            <label className={fieldLabel}>Organization</label>
            <input
              value={organization}
              onChange={(event) => setOrganization(event.target.value)}
              className={field}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={btn.secondary}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !fullName.trim()}
            className={btn.primary}
          >
            <Check size={16} />
            {saving ? "Creating…" : "Create & assign"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
