"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  ClipboardList,
  FileSpreadsheet,
  Layers,
  ListChecks,
  ListPlus,
  Plus,
  RotateCcw,
  Shuffle,
  Target,
  Timer,
  Trash2,
  Upload,
} from "lucide-react";
import { Badge, field, fieldLabel } from "@/app/components/ui";
import * as XLSX from "xlsx";
import {
  extractErrorMessage,
  readApiItem,
  readApiList,
  sortedAssignedModules,
  type Course,
} from "@/app/lib/portal-api";
import { useConfirm } from "@/app/components/useConfirm";

type AssessmentType = "PRE_TEST" | "POST_TEST";
type CorrectOption = "A" | "B" | "C" | "D" | "E";

type AssessmentQuestion = {
  id: number;
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
  max_attempts: "1",
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
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [openQuestionFormId, setOpenQuestionFormId] = useState<number | null>(
    null,
  );
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);
  const [addingQuestion, setAddingQuestion] = useState(false);

  const loadAssessments = useCallback(async () => {
    try {
      // Module-builder mode: just this module's assessments.
      if (moduleId !== undefined) {
        const response = await fetch("/api/training/assessments", {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            extractErrorMessage(payload, "Could not load assessments."),
          );
        }

        setModuleOptions([]);
        setAssessments(
          readApiList<Assessment>(payload).filter(
            (assessment) => assessment.module === moduleId,
          ),
        );
        setError("");
        return;
      }

      // Course-builder mode: assessments belong to Modules, so scope the
      // list to the modules currently assigned to this course.
      const [assessmentsResponse, courseResponse] = await Promise.all([
        fetch("/api/training/assessments", { cache: "no-store" }),
        fetch(`/api/training/courses/${courseId}`, { cache: "no-store" }),
      ]);
      const payload = await assessmentsResponse.json().catch(() => null);
      const coursePayload = await courseResponse.json().catch(() => null);

      if (!assessmentsResponse.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not load assessments."),
        );
      }

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
        readApiList<Assessment>(payload).filter(
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
          type: form.type,
          title: form.title.trim(),
          pass_mark: form.pass_mark,
          max_attempts: Number(form.max_attempts),
          duration: Number(form.duration) || 30,
          shuffle_questions: form.shuffle_questions,
          shuffle_options: form.shuffle_options,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not create assessment."),
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
    setOpenQuestionFormId((current) =>
      current === assessment.id ? null : assessment.id,
    );
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
            value={form.type}
            onChange={(event) =>
              setForm({
                ...form,
                type: event.target.value as AssessmentType,
              })
            }
            className={field}
          >
            <option value="PRE_TEST">Pre-Test</option>
            <option value="POST_TEST">Post-Test</option>
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

        <button
          disabled={
            saving ||
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
                          : "Unlimited attempts"}
                      </span>
                      {assessment.duration ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Timer size={13} className="text-gray-400" />
                          {assessment.duration} min
                        </span>
                      ) : null}
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
                      onClick={() => toggleQuestionForm(assessment)}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#1a6b3c] px-4 py-2 text-sm font-semibold text-[#1a6b3c] hover:bg-green-50"
                    >
                      <ListPlus size={16} />
                      {openQuestionFormId === assessment.id
                        ? "Close form"
                        : "Add question"}
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
