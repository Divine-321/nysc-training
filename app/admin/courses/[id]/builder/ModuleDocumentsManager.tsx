"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  FileUp,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  activityContentType,
  activityUrl,
  createActivity,
  deleteActivity,
  isActivitiesApiLive,
  swapActivityOrder,
  toViewerActivity,
  updateActivity,
  type AdminActivity,
  type LegacyDocType,
} from "@/app/lib/activities-api";
import type { ActivityContentType } from "@/app/lib/training-types";
import { readApiList } from "@/app/lib/portal-api";
import type { Assessment as CourseAssessment } from "@/app/lib/staff-learning";
import { uploadFileToCloudinary } from "@/app/lib/cloudinary-upload";
import ActivityViewer from "@/app/components/ActivityViewer";
import RichTextEditor from "@/app/components/RichTextEditor";
import { useConfirm } from "@/app/components/useConfirm";

// Re-exported so CourseModulesManager can type the module payload.
export type Activity = AdminActivity;

type ModuleActivitiesManagerProps = {
  moduleId: number;
  courseId: number;
  activities: Activity[];
  onChanged: () => Promise<void>;
};

type ContentTypeConfig = {
  value: ActivityContentType;
  label: string;
  /** How the admin supplies the content. */
  input: "upload" | "url" | "text" | "assessment";
  /** Best-effort mapping to the legacy backend doc_type. */
  docType: LegacyDocType;
  accept?: string;
};

const CONTENT_TYPES: ContentTypeConfig[] = [
  { value: "VIDEO", label: "Video", input: "upload", docType: "VIDEO", accept: "video/*" },
  { value: "PDF", label: "PDF", input: "upload", docType: "PDF", accept: ".pdf,application/pdf" },
  { value: "PPT", label: "Slides (PPT)", input: "upload", docType: "PPT", accept: ".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" },
  { value: "AUDIO", label: "Audio", input: "upload", docType: "OTHER", accept: "audio/*" },
  { value: "EXTERNAL", label: "External Link", input: "url", docType: "OTHER" },
  { value: "TEXT", label: "Text lesson", input: "text", docType: "OTHER" },
  { value: "ASSESSMENT", label: "Assessment", input: "assessment", docType: "OTHER" },
];

function configFor(type: ActivityContentType): ContentTypeConfig {
  return CONTENT_TYPES.find((item) => item.value === type) ?? CONTENT_TYPES[0];
}

function filenameWithoutExtension(filename: string) {
  return filename.replace(/\.[^/.]+$/, "");
}

/** True when the editor HTML has neither readable text nor embedded media. */
function richTextIsEmpty(html: string) {
  return (
    html.replace(/<[^>]*>/g, "").trim().length === 0 &&
    !/<(img|video|audio)\b/i.test(html)
  );
}

export default function ModuleActivitiesManager({
  moduleId,
  courseId,
  activities,
  onChanged,
}: ModuleActivitiesManagerProps) {
  const { confirm, dialog } = useConfirm();
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState<ActivityContentType>("VIDEO");
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [assessmentId, setAssessmentId] = useState("");
  const [courseAssessments, setCourseAssessments] = useState<
    CourseAssessment[] | null
  >(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [previewActivity, setPreviewActivity] = useState<Activity | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [textPersists, setTextPersists] = useState(true);

  // Legacy module-docs storage drops text_content; warn authors until the
  // Activities API (which persists it) is live.
  useEffect(() => {
    let active = true;

    void isActivitiesApiLive().then((live) => {
      if (active) setTextPersists(live);
    });

    return () => {
      active = false;
    };
  }, []);

  // The course's assessments, loaded once the admin first picks the
  // Assessment activity type.
  useEffect(() => {
    if (contentType !== "ASSESSMENT" || courseAssessments !== null) return;

    let active = true;

    const loadAssessmentOptions = async () => {
      try {
        const response = await fetch("/api/training/assessments", {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);
        const list = response.ok
          ? readApiList<CourseAssessment>(payload).filter(
              (assessment) => assessment.course === courseId,
            )
          : [];

        if (active) setCourseAssessments(list);
      } catch {
        if (active) setCourseAssessments([]);
      }
    };

    void loadAssessmentOptions();

    return () => {
      active = false;
    };
  }, [contentType, courseAssessments, courseId]);

  const config = configFor(contentType);
  const sortedActivities = activities
    .slice()
    .sort((first, second) => first.order - second.order);
  const editingActivity =
    editingId === null
      ? null
      : sortedActivities.find((activity) => activity.id === editingId) ?? null;

  const resetForm = () => {
    setTitle("");
    setContentType("VIDEO");
    setFile(null);
    setExternalUrl("");
    setTextContent("");
    setAssessmentId("");
    setEditingId(null);
    setProgress(0);
    setFileInputKey((current) => current + 1);
  };

  const startEditing = (activity: Activity) => {
    const kind = activityContentType(activity);

    setEditingId(activity.id);
    setTitle(activity.title);
    setContentType(kind);
    setFile(null);
    setExternalUrl(kind === "EXTERNAL" ? activityUrl(activity) : "");
    setTextContent(activity.text_content ?? "");
    setAssessmentId(
      kind === "ASSESSMENT"
        ? String(activity.assessment_id ?? activity.assessment ?? "")
        : "",
    );
    setError("");
    setNotice("");
    setFileInputKey((current) => current + 1);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim()) {
      setError("Please enter an activity title.");
      return;
    }

    const keepsExistingFile =
      editingActivity !== null && Boolean(activityUrl(editingActivity));

    if (config.input === "upload" && !file && !keepsExistingFile) {
      setError("Please select a file for this activity.");
      return;
    }
    if (config.input === "url" && !externalUrl.trim()) {
      setError("Please enter the external link URL.");
      return;
    }
    if (config.input === "text" && richTextIsEmpty(textContent)) {
      setError("Please enter the lesson content.");
      return;
    }
    if (config.input === "assessment" && !assessmentId) {
      setError("Please select which assessment this activity opens.");
      return;
    }

    setSaving(true);
    setProgress(0);
    setError("");
    setNotice("");

    try {
      let contentUrl: string | null = null;
      let cloudinaryPublicId: string | null =
        editingActivity?.cloudinary_public_id ?? null;

      if (config.input === "upload") {
        if (file) {
          const uploadedFile = await uploadFileToCloudinary(file, setProgress);
          contentUrl = uploadedFile.secure_url;
          cloudinaryPublicId = uploadedFile.public_id;
        } else if (editingActivity) {
          contentUrl = activityUrl(editingActivity) || null;
        }
      } else if (config.input === "url") {
        contentUrl = externalUrl.trim();
      }

      const input = {
        module: moduleId,
        title: title.trim(),
        order: editingActivity ? editingActivity.order : activities.length,
        content_type: contentType,
        content_url: contentUrl,
        text_content: config.input === "text" ? textContent : null,
        doc_type: config.docType,
        cloudinary_public_id: cloudinaryPublicId,
        assessment_id:
          config.input === "assessment" ? Number(assessmentId) : null,
      };

      if (editingActivity) {
        await updateActivity(editingActivity.id, input);
        setNotice("Content updated successfully.");
      } else {
        await createActivity(input);
        setNotice("Content added successfully.");
      }

      resetForm();
      await onChanged();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save the activity.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (activity: Activity) => {
    const confirmed = await confirm(
      `Delete "${activity.title}" from this activity?`,
      { danger: true },
    );

    if (!confirmed) return;

    setDeletingId(activity.id);
    setError("");
    setNotice("");

    try {
      await deleteActivity(activity.id);

      if (editingId === activity.id) resetForm();

      setNotice("Content deleted successfully.");
      await onChanged();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete this activity.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const moveActivity = async (currentIndex: number, newIndex: number) => {
    if (newIndex < 0 || newIndex >= sortedActivities.length) return;

    setReordering(true);
    setError("");

    try {
      await swapActivityOrder(
        sortedActivities[currentIndex],
        sortedActivities[newIndex],
      );
      await onChanged();
    } catch (reorderError) {
      setError(
        reorderError instanceof Error
          ? reorderError.message
          : "Could not reorder activities.",
      );
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
      <div>
        <p className="text-sm font-semibold text-gray-700">Activities</p>
        <p className="text-xs text-gray-500">
          Add the learning resources for this activity: video, PDF, slides,
          audio, an external link, a text lesson, or an assessment.
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

      {sortedActivities.length > 0 && (
        <ul className="space-y-2">
          {sortedActivities.map((activity, index) => {
            const kind = activityContentType(activity);
            const isBeingEdited = editingId === activity.id;

            return (
              <li
                key={activity.id}
                className={`flex items-center justify-between gap-3 rounded-lg p-3 ${
                  isBeingEdited
                    ? "bg-green-50 ring-1 ring-[#1a6b3c]/30"
                    : "bg-gray-50"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">
                    {activity.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {configFor(kind).label}
                    {isBeingEdited && " — editing"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => moveActivity(index, index - 1)}
                    disabled={index === 0 || reordering}
                    aria-label="Move activity up"
                    className="text-gray-500 disabled:opacity-30"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveActivity(index, index + 1)}
                    disabled={index === sortedActivities.length - 1 || reordering}
                    aria-label="Move activity down"
                    className="text-gray-500 disabled:opacity-30"
                  >
                    <ArrowDown size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewActivity(activity)}
                    aria-label={`Preview ${activity.title}`}
                    className="text-[#1a6b3c]"
                  >
                    <Eye size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => startEditing(activity)}
                    aria-label={`Edit ${activity.title}`}
                    className="text-[#1a6b3c]"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(activity)}
                    disabled={deletingId === activity.id}
                    aria-label={`Delete ${activity.title}`}
                    className="text-red-600 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
        {editingActivity && (
          <p className="text-xs font-semibold text-[#1a6b3c] sm:col-span-2">
            Editing “{editingActivity.title}”
          </p>
        )}

        <input
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Content title"
          className="rounded-lg border px-3 py-2 text-sm"
        />

        <select
          value={contentType}
          onChange={(event) => {
            setContentType(event.target.value as ActivityContentType);
            setFile(null);
            setExternalUrl("");
            setTextContent("");
            setAssessmentId("");
            setFileInputKey((current) => current + 1);
          }}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          {CONTENT_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {config.input === "upload" && (
          <div className="sm:col-span-2">
            <input
              key={fileInputKey}
              type="file"
              accept={config.accept}
              onChange={(event) => {
                const selectedFile = event.target.files?.[0] ?? null;
                setFile(selectedFile);

                if (selectedFile) {
                  setTitle((current) =>
                    current || filenameWithoutExtension(selectedFile.name),
                  );
                }
              }}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
            {editingActivity &&
              activityContentType(editingActivity) === contentType &&
              activityUrl(editingActivity) && (
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty to keep the current file.
                </p>
              )}
          </div>
        )}

        {config.input === "url" && (
          <input
            required
            type="url"
            value={externalUrl}
            onChange={(event) => setExternalUrl(event.target.value)}
            placeholder="https://example.com/resource"
            className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"
          />
        )}

        {config.input === "assessment" && (
          <div className="space-y-2 sm:col-span-2">
            <select
              required
              value={assessmentId}
              onChange={(event) => setAssessmentId(event.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">
                {courseAssessments === null
                  ? "Loading assessments..."
                  : "Select the assessment this activity opens..."}
              </option>
              {(courseAssessments ?? []).map((assessment) => (
                <option key={assessment.id} value={String(assessment.id)}>
                  {assessment.title} (
                  {assessment.type === "PRE_TEST" ? "Pre-test" : "Post-test"})
                </option>
              ))}
            </select>
            {courseAssessments !== null && courseAssessments.length === 0 && (
              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                This module has no assessments yet — create one in the
                Assessments tab first.
              </p>
            )}
            <p className="text-xs text-gray-400">
              Staff will open this assessment from its place in the module
              flow.
            </p>
          </div>
        )}

        {config.input === "text" && (
          <div className="space-y-2 sm:col-span-2">
            {!textPersists && (
              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                Text lessons will appear to staff once the new content engine
                is deployed (rolling out now). Files, links, video and audio
                activities are unaffected.
              </p>
            )}
            <RichTextEditor
              value={textContent}
              onChange={setTextContent}
              disabled={saving}
            />
            <p className="text-xs text-gray-400">
              Write the lesson like a page: mix headings, text, images, video
              and audio. Staff read it directly inside the course player.
            </p>
          </div>
        )}

        {saving && config.input === "upload" && file && (
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

        <div className="flex gap-2 sm:col-span-2">
          <button
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#1a6b3c] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {editingActivity ? <Save size={17} /> : <FileUp size={17} />}
            {saving
              ? "Saving..."
              : editingActivity
                ? "Update activity"
                : "Add activity"}
          </button>

          {editingActivity && (
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="rounded-lg border px-4 py-2.5 text-sm font-semibold text-gray-600"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {previewActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {previewActivity.title}
                </h3>
                <p className="text-xs text-gray-500">
                  {configFor(activityContentType(previewActivity)).label} — as
                  staff will see it
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewActivity(null)}
                aria-label="Close preview"
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <ActivityViewer activity={toViewerActivity(previewActivity)} />
          </div>
        </div>
      )}

      {dialog}
    </div>
  );
}
