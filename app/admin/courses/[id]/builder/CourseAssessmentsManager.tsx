"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  Check,
  ClipboardList,
  Download,
  Eye,
  FileSpreadsheet,
  Layers,
  ListChecks,
  ListPlus,
  Pencil,
  Plus,
  RotateCcw,
  Shuffle,
  Target,
  Timer,
  Trash2,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { Badge, field, fieldLabel } from "@/app/components/ui";
import * as XLSX from "xlsx";
import {
  extractErrorMessage,
  fetchAllPages,
  readApiItem,
  sortedAssignedModules,
  type Course,
} from "@/app/lib/portal-api";
import { useConfirm } from "@/app/components/useConfirm";
import { cachedFetch } from "@/app/lib/data-cache";

type AssessmentType = "PRE_TEST" | "POST_TEST";
type CorrectOption = "A" | "B" | "C" | "D" | "E";

type AssessmentQuestionOption = {
  id: number;
  text: string;
  /**
   * Admin-only: which option is the answer. Absent on staff-facing responses,
   * and absent entirely on backends predating the field — the UI just omits
   * the answer key rather than guessing.
   */
  is_correct?: boolean;
};

type AssessmentQuestion = {
  id: number;
  text?: string;
  points?: number;
  order?: number;
  options?: AssessmentQuestionOption[];
};

// Reusable-modules backend (2026-07-12): assessments belong to a Module.
type Assessment = {
  id: number;
  module: number | null;
  module_title: string;
  type: AssessmentType;
  title: string;
  description: string | null;
  pass_mark: string;
  max_attempts: number;
  duration?: number;
  /** Per-attempt server-side shuffling (deployed 2026-07-14). */
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  questions: AssessmentQuestion[];
};

type ModuleOption = {
  id: number;
  title: string;
};

const emptyForm = {
  module: "",
  type: "PRE_TEST" as AssessmentType,
  title: "",
  pass_mark: "50.00",
  // Blank so the field shows the chosen type's default as its
  // placeholder. A number here would override that default silently.
  max_attempts: "",
  duration: "30",
  // Shuffle by default — the whole point is exam integrity. Admins can
  // untick for sequential question sets.
  shuffle_questions: true,
  shuffle_options: true,
};

const emptyQuestionForm = {
  question_text: "",
  points: "1",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  // Optional 5th option — only sent when filled in.
  option_e: "",
  correct_option: "A" as CorrectOption,
};

function assessmentTypeLabel(type: AssessmentType) {
  return type === "PRE_TEST" ? "Pre-Test" : "Post-Test";
}

export default function CourseAssessmentsManager({
  courseId,
  moduleId,
  onChanged,
}: {
  /** Course-builder mode: manage assessments across the course's modules. */
  courseId?: number;
  /** Module-builder mode: manage the assessments of one library module. */
  moduleId?: number;
  /** Called after any assessment change (create/delete/questions). */
  onChanged?: () => void | Promise<void>;
}) {
  const { confirm, dialog } = useConfirm();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [moduleOptions, setModuleOptions] = useState<ModuleOption[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(
    null,
  );
  const [questionEditForm, setQuestionEditForm] = useState<{
    text: string;
    points: string;
    options: AssessmentQuestionOption[];
  }>({ text: "", points: "1", options: [] });
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [deletingQuestionId, setDeletingQuestionId] = useState<number | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // Which assessment has its question list expanded. Admins upload questions by
  // CSV and otherwise only see a count, so this is the one way to check what
  // actually landed.
  const [openQuestionsId, setOpenQuestionsId] = useState<number | null>(null);
  const [openQuestionFormId, setOpenQuestionFormId] = useState<number | null>(
    null,
  );
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [savingEdit, setSavingEdit] = useState(false);

  const loadAssessments = useCallback(async () => {
    try {
      // Module-builder mode: just this module's assessments.
      if (moduleId !== undefined) {
        // Every page, not just the first. The list is paginated, so reading
        // one page hid most modules' assessments — they still existed and
        // still blocked re-creation, they were simply never shown.
        const all = await fetchAllPages<Assessment>(
          "/api/training/assessments",
          cachedFetch,
          { errorMessage: "Could not load assessments." },
        );

        setModuleOptions([]);
        setAssessments(
          all.filter((assessment) => assessment.module === moduleId),
        );
        setError("");
        return;
      }

      // Course-builder mode: assessments belong to Modules, so scope the
      // list to the modules currently assigned to this course.
      const [allAssessments, courseResponse] = await Promise.all([
        fetchAllPages<Assessment>("/api/training/assessments", cachedFetch, {
          errorMessage: "Could not load assessments.",
        }),
        cachedFetch(`/api/training/courses/${courseId}`),
      ]);
      const coursePayload = await courseResponse.json().catch(() => null);

      const courseModules = courseResponse.ok
        ? sortedAssignedModules(readApiItem<Course>(coursePayload)).map(
            (link) => ({
              id: link.module,
              title: link.module_details?.title ?? `Module ${link.module}`,
            }),
          )
        : [];
      const courseModuleIds = new Set(courseModules.map((item) => item.id));

      setModuleOptions(courseModules);
      setAssessments(
        allAssessments.filter(
          (assessment) =>
            assessment.module !== null &&
            courseModuleIds.has(assessment.module),
        ),
      );
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load assessments.",
      );
    } finally {
      setLoading(false);
    }
  }, [courseId, moduleId]);

  useEffect(() => {
    const fetchData = async () => {
      await loadAssessments();
    };

    void fetchData();
  }, [loadAssessments]);

  // One assessment of each type is allowed per module, so a type that already
  // exists must not be offered again — the backend would reject it.
  const takenTypes = useMemo(() => {
    const target = moduleId ?? Number(form.module);
    if (!target) return new Set<AssessmentType>();

    return new Set(
      assessments
        .filter((assessment) => assessment.module === target)
        .map((assessment) => assessment.type as AssessmentType),
    );
  }, [assessments, moduleId, form.module]);

  const bothTypesTaken =
    takenTypes.has("PRE_TEST") && takenTypes.has("POST_TEST");

  // Derived, not stored: when the chosen type is already taken the other one
  // is shown instead, so a module that has a pre-test opens on post-test
  // rather than on a dead choice. Deriving avoids a second render pass.
  const selectedType: AssessmentType =
    takenTypes.has(form.type) && !bothTypesTaken
      ? form.type === "PRE_TEST"
        ? "POST_TEST"
        : "PRE_TEST"
      : form.type;

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/training/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: moduleId ?? Number(form.module),
          type: selectedType,
          title: form.title.trim(),
          pass_mark: form.pass_mark,
          // null, not 0: the backend reads 0 as "zero attempts allowed"
          // and refuses every start with "Maximum attempts (0) reached".
          // Floored at one: `min` only constrains the stepper, and a 0 is
          // stored literally and refuses every start.
          max_attempts: Math.max(1, Number(form.max_attempts) || 1),
          duration: Number(form.duration) || 30,
          shuffle_questions: form.shuffle_questions,
          shuffle_options: form.shuffle_options,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const raw = extractErrorMessage(
          payload,
          "Could not create assessment.",
        );

        // The backend allows one assessment of each type per module and
        // rejects a second with DRF's raw validator text ("The fields module,
        // type must make a unique set"), which means nothing to an admin.
        throw new Error(
          /unique set/i.test(raw)
            ? `This module already has a ${assessmentTypeLabel(selectedType)}. Edit the existing one below instead of creating another.`
            : raw,
        );
      }

      setForm(emptyForm);
      setNotice("Assessment created. You can now upload its questions CSV.");
      await loadAssessments();
      await onChanged?.();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create assessment.",
      );
    } finally {
      setSaving(false);
    }
  };

  const startEditingQuestion = (question: AssessmentQuestion) => {
    setEditingQuestionId((current) =>
      current === question.id ? null : question.id,
    );
    setQuestionEditForm({
      text: question.text ?? "",
      points: String(question.points ?? 1),
      options: (question.options ?? []).map((option) => ({ ...option })),
    });
    setError("");
    setNotice("");
  };

  /**
   * Saves a question and its options.
   *
   * Question fields and option fields live on different endpoints, so this
   * sends what actually changed: the question itself, any option whose text was
   * edited, and the newly correct option. Marking one option correct clears the
   * flag on its siblings server-side, so only that one needs sending.
   */
  const handleSaveQuestion = async (
    event: FormEvent,
    original: AssessmentQuestion,
  ) => {
    event.preventDefault();
    setSavingQuestion(true);
    setError("");
    setNotice("");

    try {
      const points = Number(questionEditForm.points) || 1;
      const questionChanged =
        questionEditForm.text.trim() !== (original.text ?? "") ||
        points !== (original.points ?? 1);

      if (questionChanged) {
        const response = await fetch(
          `/api/training/questions/${original.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: questionEditForm.text.trim(),
              points,
            }),
          },
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(
            extractErrorMessage(payload, "Could not update this question."),
          );
        }
      }

      for (const option of questionEditForm.options) {
        const before = (original.options ?? []).find(
          (item) => item.id === option.id,
        );
        const textChanged = before && option.text !== before.text;
        const becameCorrect = option.is_correct && !before?.is_correct;

        if (!textChanged && !becameCorrect) continue;

        const response = await fetch(`/api/training/options/${option.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(textChanged ? { text: option.text } : {}),
            ...(becameCorrect ? { is_correct: true } : {}),
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(
            extractErrorMessage(payload, "Could not update an option."),
          );
        }
      }

      setEditingQuestionId(null);
      setNotice("Question updated.");
      await loadAssessments();
      await onChanged?.();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not update this question.",
      );
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (
    assessment: Assessment,
    question: AssessmentQuestion,
  ) => {
    const confirmed = await confirm(
      `Delete this question from "${assessment.title}"? Staff who already sat this assessment keep their recorded scores.`,
      { danger: true },
    );
    if (!confirmed) return;

    setDeletingQuestionId(question.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/training/questions/${question.id}`, {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          extractErrorMessage(payload, "Could not delete this question."),
        );
      }

      setNotice("Question deleted.");
      await loadAssessments();
      await onChanged?.();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete this question.",
      );
    } finally {
      setDeletingQuestionId(null);
    }
  };

  /**
   * Blank question template with the exact headers the upload expects. Handed
   * over as a file the browser saves, since mismatched column names are the
   * usual reason a bulk upload fails.
   */
  const handleDownloadTemplate = async (assessment: Assessment) => {
    setDownloadingId(assessment.id);
    setError("");

    try {
      const response = await fetch(
        `/api/training/assessments/${assessment.id}/download-template`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          extractErrorMessage(payload, "Could not download the template."),
        );
      }

      // Prefer the server's own filename — it knows whether it built a CSV or
      // an .xlsx. Fall back to one derived from the assessment title.
      const disposition = response.headers.get("content-disposition") ?? "";
      const serverName = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i
        .exec(disposition)?.[1]
        ?.trim();
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download =
        serverName ||
        `${assessment.title.replace(/[^\w\-]+/g, "-")}-questions-template.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Could not download the template.",
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCsvUpload = async (
    assessment: Assessment,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isCsv = lowerName.endsWith(".csv");
    const isExcel = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls");

    if (!isCsv && !isExcel) {
      setError("Please select a CSV or Excel (.xlsx/.xls) file.");
      return;
    }

    setUploadingId(assessment.id);
    setError("");
    setNotice("");

    let uploadFile = file;

    if (isExcel) {
      try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const csvText = XLSX.utils.sheet_to_csv(sheet);
        uploadFile = new File(
          [csvText],
          file.name.replace(/\.(xlsx|xls)$/i, ".csv"),
          { type: "text/csv" },
        );
      } catch {
        setError("Could not read that Excel file. Please check its format.");
        setUploadingId(null);
        return;
      }
    }

    const formData = new FormData();
    formData.append("file", uploadFile);

    try {
      const response = await fetch(
        `/api/training/assessments/${assessment.id}/upload-questions`,
        {
          method: "POST",
          body: formData,
        },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not upload questions."),
        );
      }

      setNotice(
        `${assessmentTypeLabel(assessment.type)} questions uploaded successfully.`,
      );
      await loadAssessments();
      await onChanged?.();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload questions.",
      );
    } finally {
      setUploadingId(null);
    }
  };

  const toggleQuestionForm = (assessment: Assessment) => {
    setError("");
    setNotice("");
    setQuestionForm(emptyQuestionForm);
    setEditingId(null);
    setOpenQuestionFormId((current) =>
      current === assessment.id ? null : assessment.id,
    );
  };

  const startEdit = (assessment: Assessment) => {
    setError("");
    setNotice("");
    setOpenQuestionFormId(null);

    if (editingId === assessment.id) {
      setEditingId(null);
      return;
    }

    setEditForm({
      module: assessment.module != null ? String(assessment.module) : "",
      type: assessment.type,
      title: assessment.title,
      pass_mark: assessment.pass_mark ?? "50.00",
      // A stored 0 was an old convention for "unlimited" that the backend
      // enforces literally, locking every learner out. Left blank so it has
      // to be filled in rather than saved back unchanged.
      max_attempts: assessment.max_attempts
        ? String(assessment.max_attempts)
        : "",
      duration: String(assessment.duration ?? 30),
      shuffle_questions: assessment.shuffle_questions ?? true,
      shuffle_options: assessment.shuffle_options ?? true,
    });
    setEditingId(assessment.id);
  };

  const handleUpdate = async (event: FormEvent, assessment: Assessment) => {
    event.preventDefault();
    setSavingEdit(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/training/assessments/${assessment.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: editForm.type,
            title: editForm.title.trim(),
            pass_mark: editForm.pass_mark,
            max_attempts: Math.max(1, Number(editForm.max_attempts) || 1),
            duration: Number(editForm.duration) || 30,
            shuffle_questions: editForm.shuffle_questions,
            shuffle_options: editForm.shuffle_options,
          }),
        },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not update assessment."),
        );
      }

      setNotice("Assessment settings updated.");
      setEditingId(null);
      await loadAssessments();
      await onChanged?.();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update assessment.",
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAddQuestion = async (
    event: FormEvent,
    assessment: Assessment,
  ) => {
    event.preventDefault();

    if (
      questionForm.correct_option === "E" &&
      !questionForm.option_e.trim()
    ) {
      setError("Option E is empty — fill it in or pick another correct option.");
      return;
    }

    setAddingQuestion(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/training/assessments/${assessment.id}/add-question`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question_text: questionForm.question_text.trim(),
            points: Number(questionForm.points) || 1,
            option_a: questionForm.option_a.trim(),
            option_b: questionForm.option_b.trim(),
            option_c: questionForm.option_c.trim(),
            option_d: questionForm.option_d.trim(),
            // Optional 5th option — omitted for 4-option questions.
            ...(questionForm.option_e.trim()
              ? { option_e: questionForm.option_e.trim() }
              : {}),
            correct_option: questionForm.correct_option,
          }),
        },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not add question."),
        );
      }

      setNotice("Question added.");
      setQuestionForm(emptyQuestionForm);
      await loadAssessments();
      await onChanged?.();
    } catch (addError) {
      setError(
        addError instanceof Error ? addError.message : "Could not add question.",
      );
    } finally {
      setAddingQuestion(false);
    }
  };

  const handleDelete = async (assessment: Assessment) => {
    const confirmed = await confirm(
      `Delete "${assessment.title}" and its questions?`,
      { danger: true },
    );

    if (!confirmed) return;

    setDeletingId(assessment.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/training/assessments/${assessment.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          extractErrorMessage(payload, "Could not delete assessment."),
        );
      }

      setNotice("Assessment deleted.");
      await loadAssessments();
      await onChanged?.();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete assessment.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <ClipboardList className="text-[#1a6b3c]" size={22} />
        <div>
          <h3 className="text-lg font-bold text-[#1a6b3c]">
            Assessments
          </h3>
          <p className="text-sm text-gray-500">
            Create pre-test/post-test and add questions manually or via CSV.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {notice}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="grid gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 md:grid-cols-2"
      >
        {moduleId === undefined ? (
          <div className="md:col-span-2">
            <label className={fieldLabel}>
              Module
            </label>
            <select
              required
              value={form.module}
              onChange={(event) =>
                setForm({ ...form, module: event.target.value })
              }
              className={field}
            >
              <option value="">
                {moduleOptions.length === 0
                  ? "Add a module to this course first"
                  : "Select the module this assessment belongs to"}
              </option>
              {moduleOptions.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.title}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Assessments belong to a module — reusing the module in another
              course brings its assessments along.
            </p>
          </div>
        ) : (
          <p className="rounded-lg bg-[#f0f7f3] px-3 py-2 text-xs text-gray-600 md:col-span-2">
            This assessment is created on this module — every course that
            reuses the module gets it automatically.
          </p>
        )}

        <div>
          <label className={fieldLabel}>
            Assessment type
          </label>
          <select
            value={selectedType}
            onChange={(event) =>
              setForm({
                ...form,
                type: event.target.value as AssessmentType,
                // Cleared, so a limit chosen for a pre-test is never
                // carried onto the test that decides who passes.
                max_attempts: "",
              })
            }
            className={field}
          >
            <option value="PRE_TEST" disabled={takenTypes.has("PRE_TEST")}>
              {takenTypes.has("PRE_TEST")
                ? "Pre-Test — already created"
                : "Pre-Test"}
            </option>
            <option value="POST_TEST" disabled={takenTypes.has("POST_TEST")}>
              {takenTypes.has("POST_TEST")
                ? "Post-Test — already created"
                : "Post-Test"}
            </option>
          </select>
        </div>

        <div>
          <label className={fieldLabel}>
            Title
          </label>
          <input
            required
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
            placeholder="For example: Module Pre-Test"
            className={field}
          />
        </div>

        <div>
          <label className={fieldLabel}>
            Pass mark (%)
          </label>
          <input
            required
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.pass_mark}
            onChange={(event) =>
              setForm({ ...form, pass_mark: event.target.value })
            }
            className={field}
          />
        </div>

        <div>
          <label className={fieldLabel}>
            Max attempts
          </label>
          <input
            required
            type="number"
            min="1"
            value={form.max_attempts}
            onChange={(event) =>
              setForm({ ...form, max_attempts: event.target.value })
            }
            className={field}
          />
        </div>

        <div>
          <label className={fieldLabel}>
            Duration (minutes)
          </label>
          <input
            required
            type="number"
            min="1"
            value={form.duration}
            onChange={(event) =>
              setForm({ ...form, duration: event.target.value })
            }
            className={field}
          />
        </div>

        {/* Per-attempt server-side shuffling (backend, 2026-07-14). */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 md:col-span-2">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={form.shuffle_questions}
              onChange={(event) =>
                setForm({ ...form, shuffle_questions: event.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300 accent-[#1a6b3c]"
            />
            Shuffle questions
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={form.shuffle_options}
              onChange={(event) =>
                setForm({ ...form, shuffle_options: event.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300 accent-[#1a6b3c]"
            />
            Shuffle answer options
          </label>
          <span className="text-xs text-gray-400">
            Each staff member gets their own random order.
          </span>
        </div>

        {bothTypesTaken && (
          <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
            This module already has both a pre-test and a post-test. Edit them
            below, or delete one to create it again.
          </p>
        )}

        <button
          disabled={
            saving ||
            bothTypesTaken ||
            takenTypes.has(selectedType) ||
            !form.title.trim() ||
            (moduleId === undefined && !form.module)
          }
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1a6b3c] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Plus size={18} />
          {saving ? "Creating..." : "Create assessment"}
        </button>
      </form>

      <div className="rounded-xl border border-gray-100">
        <div className="border-b border-gray-100 p-4">
          <h4 className="font-semibold text-gray-800">
            Existing assessments
          </h4>
          <p className="mt-1 text-xs text-gray-500">
            CSV/Excel headers: question_text, points, option_a, option_b,
            option_c, option_d, option_e (optional), correct_option
          </p>
        </div>

        {loading ? (
          <p className="p-4 text-sm text-gray-500">Loading assessments...</p>
        ) : assessments.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">
            {moduleId !== undefined
              ? "No assessments on this module yet."
              : "No assessments have been created for this course's modules."}
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {assessments.map((assessment) => (
              <div key={assessment.id} className="p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          assessment.type === "POST_TEST" ? "green" : "blue"
                        }
                      >
                        {assessmentTypeLabel(assessment.type)}
                      </Badge>
                      {assessment.module_title ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                          <Layers size={12} className="text-gray-400" />
                          {assessment.module_title}
                        </span>
                      ) : null}
                      {assessment.shuffle_questions ||
                      assessment.shuffle_options ? (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700"
                          title={`Shuffles ${[
                            assessment.shuffle_questions ? "questions" : null,
                            assessment.shuffle_options ? "answer options" : null,
                          ]
                            .filter(Boolean)
                            .join(" and ")} per staff member`}
                        >
                          <Shuffle size={12} />
                          Shuffled
                        </span>
                      ) : null}
                    </div>
                    <h5 className="mt-2 font-semibold text-gray-900">
                      {assessment.title}
                    </h5>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-medium text-gray-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Target size={13} className="text-gray-400" />
                        Pass mark {assessment.pass_mark}%
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <RotateCcw size={13} className="text-gray-400" />
                        {assessment.max_attempts
                          ? `${assessment.max_attempts} attempt${
                              assessment.max_attempts === 1 ? "" : "s"
                            }`
                          : "No attempt limit set"}
                      </span>
                      {assessment.duration ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Timer size={13} className="text-gray-400" />
                          {assessment.duration} min
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700"
                          title="This assessment has no time limit, so it will not show a countdown or auto-submit. Edit it to set one."
                        >
                          <TriangleAlert size={13} />
                          No time limit — set one
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5">
                        <ListChecks size={13} className="text-gray-400" />
                        {assessment.questions?.length ?? 0} question
                        {(assessment.questions?.length ?? 0) === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenQuestionsId((current) =>
                          current === assessment.id ? null : assessment.id,
                        )
                      }
                      disabled={(assessment.questions?.length ?? 0) === 0}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                      title={
                        (assessment.questions?.length ?? 0) === 0
                          ? "No questions to view yet"
                          : "View the questions on this assessment"
                      }
                    >
                      <Eye size={16} />
                      {openQuestionsId === assessment.id
                        ? "Hide questions"
                        : "View questions"}
                    </button>

                    <button
                      type="button"
                      onClick={() => startEdit(assessment)}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <Pencil size={16} />
                      {editingId === assessment.id ? "Close" : "Edit"}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleQuestionForm(assessment)}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#1a6b3c] px-4 py-2 text-sm font-semibold text-[#1a6b3c] hover:bg-green-50"
                    >
                      <ListPlus size={16} />
                      {openQuestionFormId === assessment.id
                        ? "Close form"
                        : "Add question"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadTemplate(assessment)}
                      disabled={downloadingId === assessment.id}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      title="Download a blank file with the exact column headers the upload expects"
                    >
                      <Download size={16} />
                      {downloadingId === assessment.id
                        ? "Preparing..."
                        : "Template"}
                    </button>

                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#1a6b3c] px-4 py-2 text-sm font-semibold text-[#1a6b3c] hover:bg-green-50">
                      <Upload size={16} />
                      {uploadingId === assessment.id
                        ? "Uploading..."
                        : "Upload CSV/Excel"}
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        disabled={uploadingId === assessment.id}
                        onChange={(event) =>
                          handleCsvUpload(assessment, event)
                        }
                        className="sr-only"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => handleDelete(assessment)}
                      disabled={deletingId === assessment.id}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      {deletingId === assessment.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>

                {openQuestionsId === assessment.id && (
                  <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <ListChecks size={15} className="text-[#1a6b3c]" />
                      {assessment.questions?.length ?? 0} question
                      {(assessment.questions?.length ?? 0) === 1 ? "" : "s"} on
                      this assessment
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Check that uploaded questions imported correctly.
                      {assessment.questions?.some((question) =>
                        question.options?.some(
                          (option) => option.is_correct !== undefined,
                        ),
                      )
                        ? " The correct answer is ticked."
                        : " This backend does not return the answer key, so correct answers are not shown."}
                    </p>

                    <ol className="mt-4 space-y-3">
                      {[...(assessment.questions ?? [])]
                        .sort(
                          (first, second) =>
                            (first.order ?? 0) - (second.order ?? 0),
                        )
                        .map((question, questionIndex) => (
                          <li
                            key={question.id}
                            className="rounded-lg border border-gray-200 bg-white p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-medium text-gray-800">
                                <span className="text-gray-400">
                                  {questionIndex + 1}.
                                </span>{" "}
                                {question.text || (
                                  <span className="italic text-red-600">
                                    No question text — check the upload
                                  </span>
                                )}
                              </p>
                              <div className="flex shrink-0 items-center gap-1">
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                  {question.points ?? 1} pt
                                  {(question.points ?? 1) === 1 ? "" : "s"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => startEditingQuestion(question)}
                                  aria-label="Edit this question"
                                  className="rounded-lg p-1.5 text-[#1a6b3c] transition hover:bg-green-50"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteQuestion(assessment, question)
                                  }
                                  disabled={deletingQuestionId === question.id}
                                  aria-label="Delete this question"
                                  className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-50 disabled:opacity-40"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            {editingQuestionId === question.id && (
                              <form
                                onSubmit={(event) =>
                                  handleSaveQuestion(event, question)
                                }
                                className="mt-3 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
                              >
                                <div>
                                  <label className={fieldLabel}>
                                    Question text
                                  </label>
                                  <textarea
                                    required
                                    rows={2}
                                    value={questionEditForm.text}
                                    onChange={(event) =>
                                      setQuestionEditForm((current) => ({
                                        ...current,
                                        text: event.target.value,
                                      }))
                                    }
                                    className={field}
                                  />
                                </div>

                                <div className="sm:w-32">
                                  <label className={fieldLabel}>Points</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={questionEditForm.points}
                                    onChange={(event) =>
                                      setQuestionEditForm((current) => ({
                                        ...current,
                                        points: event.target.value,
                                      }))
                                    }
                                    className={field}
                                  />
                                </div>

                                <div>
                                  <label className={fieldLabel}>
                                    Options — select the correct answer
                                  </label>
                                  <div className="space-y-2">
                                    {questionEditForm.options.map(
                                      (option, optionIndex) => (
                                        <div
                                          key={option.id}
                                          className="flex items-center gap-2"
                                        >
                                          <input
                                            type="radio"
                                            name={`correct-${question.id}`}
                                            checked={option.is_correct}
                                            onChange={() =>
                                              setQuestionEditForm((current) => ({
                                                ...current,
                                                options: current.options.map(
                                                  (item) => ({
                                                    ...item,
                                                    is_correct:
                                                      item.id === option.id,
                                                  }),
                                                ),
                                              }))
                                            }
                                            className="accent-[#1a6b3c]"
                                            aria-label={`Mark option ${String.fromCharCode(65 + optionIndex)} correct`}
                                          />
                                          <span className="w-4 text-xs text-gray-400">
                                            {String.fromCharCode(
                                              65 + optionIndex,
                                            )}
                                          </span>
                                          <input
                                            required
                                            value={option.text}
                                            onChange={(event) =>
                                              setQuestionEditForm((current) => ({
                                                ...current,
                                                options: current.options.map(
                                                  (item) =>
                                                    item.id === option.id
                                                      ? {
                                                          ...item,
                                                          text: event.target
                                                            .value,
                                                        }
                                                      : item,
                                                ),
                                              }))
                                            }
                                            className={`${field} flex-1`}
                                          />
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    type="submit"
                                    disabled={savingQuestion}
                                    className="rounded-lg bg-[#1a6b3c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#145530] disabled:opacity-50"
                                  >
                                    {savingQuestion ? "Saving..." : "Save"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingQuestionId(null)}
                                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            )}

                            {question.options?.length ? (
                              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                                {question.options.map(
                                  (option, optionIndex) => (
                                    <li
                                      key={option.id}
                                      className={`flex items-start gap-2 text-sm ${
                                        option.is_correct
                                          ? "font-semibold text-[#1a6b3c]"
                                          : "text-gray-600"
                                      }`}
                                    >
                                      <span
                                        className={
                                          option.is_correct
                                            ? "text-[#1a6b3c]"
                                            : "text-gray-400"
                                        }
                                      >
                                        {String.fromCharCode(65 + optionIndex)}.
                                      </span>
                                      <span>{option.text}</span>
                                      {option.is_correct && (
                                        <Check
                                          size={15}
                                          className="mt-0.5 shrink-0"
                                          aria-label="Correct answer"
                                        />
                                      )}
                                    </li>
                                  ),
                                )}
                              </ul>
                            ) : (
                              <p className="mt-2 text-sm italic text-red-600">
                                No options — this question cannot be answered.
                              </p>
                            )}
                          </li>
                        ))}
                    </ol>
                  </div>
                )}

                {editingId === assessment.id && (
                  <form
                    onSubmit={(event) => handleUpdate(event, assessment)}
                    className="mt-4 grid gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 md:grid-cols-2"
                  >
                    <p className="flex items-center gap-2 text-sm font-semibold text-gray-700 md:col-span-2">
                      <Pencil size={15} className="text-[#1a6b3c]" />
                      Edit assessment settings
                    </p>

                    <div>
                      <label className={fieldLabel}>Assessment type</label>
                      <select
                        value={editForm.type}
                        onChange={(event) => {
                          const type = event.target.value as AssessmentType;
                          setEditForm({ ...editForm, type, max_attempts: "" });
                        }}
                        className={field}
                      >
                        <option value="PRE_TEST">Pre-Test</option>
                        <option value="POST_TEST">Post-Test</option>
                      </select>
                    </div>

                    <div>
                      <label className={fieldLabel}>Title</label>
                      <input
                        required
                        value={editForm.title}
                        onChange={(event) =>
                          setEditForm({ ...editForm, title: event.target.value })
                        }
                        className={field}
                      />
                    </div>

                    <div>
                      <label className={fieldLabel}>Pass mark (%)</label>
                      <input
                        required
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={editForm.pass_mark}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            pass_mark: event.target.value,
                          })
                        }
                        className={field}
                      />
                    </div>

                    <div>
                      <label className={fieldLabel}>Max attempts</label>
                      <input
                        required
                        type="number"
                        min="1"
                        value={editForm.max_attempts}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            max_attempts: event.target.value,
                          })
                        }
                        className={field}
                      />
                    </div>

                    <div>
                      <label className={fieldLabel}>Duration (minutes)</label>
                      <input
                        required
                        type="number"
                        min="1"
                        value={editForm.duration}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            duration: event.target.value,
                          })
                        }
                        className={field}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Staff see a live countdown and the test auto-submits when
                        it reaches zero.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 md:col-span-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={editForm.shuffle_questions}
                          onChange={(event) =>
                            setEditForm({
                              ...editForm,
                              shuffle_questions: event.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-gray-300 accent-[#1a6b3c]"
                        />
                        Shuffle questions
                      </label>
                      <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={editForm.shuffle_options}
                          onChange={(event) =>
                            setEditForm({
                              ...editForm,
                              shuffle_options: event.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-gray-300 accent-[#1a6b3c]"
                        />
                        Shuffle answer options
                      </label>
                    </div>

                    <div className="flex justify-end gap-2 md:col-span-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={savingEdit || !editForm.title.trim()}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1a6b3c] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        <Pencil size={16} />
                        {savingEdit ? "Saving..." : "Save changes"}
                      </button>
                    </div>
                  </form>
                )}

                {openQuestionFormId === assessment.id && (
                  <form
                    onSubmit={(event) => handleAddQuestion(event, assessment)}
                    className="mt-4 grid gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 md:grid-cols-2"
                  >
                    <div className="md:col-span-2">
                      <label className={fieldLabel}>
                        Question text
                      </label>
                      <textarea
                        required
                        value={questionForm.question_text}
                        onChange={(event) =>
                          setQuestionForm({
                            ...questionForm,
                            question_text: event.target.value,
                          })
                        }
                        className={`${field} h-20`}
                        placeholder="What does NYSC stand for?"
                      />
                    </div>

                    {(["a", "b", "c", "d", "e"] as const).map((letter) => (
                      <div key={letter}>
                        <label className={fieldLabel}>
                          Option {letter.toUpperCase()}
                          {letter === "e" ? (
                            <span className="font-normal text-gray-400">
                              {" "}
                              (optional)
                            </span>
                          ) : null}
                        </label>
                        <input
                          required={letter !== "e"}
                          value={
                            questionForm[
                              `option_${letter}` as `option_${typeof letter}`
                            ]
                          }
                          onChange={(event) =>
                            setQuestionForm({
                              ...questionForm,
                              [`option_${letter}`]: event.target.value,
                            })
                          }
                          placeholder={
                            letter === "e"
                              ? "Leave empty for a 4-option question"
                              : undefined
                          }
                          className={field}
                        />
                      </div>
                    ))}

                    <div>
                      <label className={fieldLabel}>
                        Correct option
                      </label>
                      <select
                        value={questionForm.correct_option}
                        onChange={(event) =>
                          setQuestionForm({
                            ...questionForm,
                            correct_option: event.target
                              .value as CorrectOption,
                          })
                        }
                        className={field}
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                        <option value="E" disabled={!questionForm.option_e.trim()}>
                          E{questionForm.option_e.trim() ? "" : " (fill Option E first)"}
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className={fieldLabel}>
                        Points
                      </label>
                      <input
                        required
                        type="number"
                        min="1"
                        value={questionForm.points}
                        onChange={(event) =>
                          setQuestionForm({
                            ...questionForm,
                            points: event.target.value,
                          })
                        }
                        className={field}
                      />
                    </div>

                    <div className="md:col-span-2 flex justify-end">
                      <button
                        disabled={addingQuestion}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1a6b3c] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        <Plus size={18} />
                        {addingQuestion ? "Adding..." : "Add question"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        <div className="mb-2 flex items-center gap-2 font-semibold text-gray-800">
          <FileSpreadsheet size={18} />
          CSV/Excel example
        </div>
        <p className="mb-2 text-xs text-gray-500">
          Same columns work in a .csv, .xlsx, or .xls file — the first sheet
          is used for Excel files.
        </p>
        <code className="block overflow-x-auto whitespace-pre rounded-lg bg-white p-3 text-xs">
          question_text,points,option_a,option_b,option_c,option_d,correct_option{"\n"}
          What does NYSC stand for?,1,National Youth Service Corps,National Youth Safety Corps,Nigerian Youth Staff Council,National Young Service Club,A
        </code>
      </div>

      {dialog}
    </section>
  );
}
