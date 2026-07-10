"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Headphones,
  ImageIcon,
  PlayCircle,
  Presentation,
} from "lucide-react";
import {
  documentIsComplete,
  loadStaffCourse,
  markDocumentComplete,
  type CourseModule,
  type ModuleDocument,
  type StaffCourse,
} from "@/app/lib/staff-learning";

function DocumentIcon({ type }: { type: ModuleDocument["doc_type"] }) {
  if (type === "VIDEO") return <PlayCircle size={24} />;
  if (type === "IMAGE") return <ImageIcon size={24} />;
  if (type === "PPT") return <Presentation size={24} />;
  if (type === "OTHER") return <Headphones size={24} />;
  return <FileText size={24} />;
}

function DocumentPreview({ document }: { document: ModuleDocument }) {
  if (document.doc_type === "VIDEO") {
    return (
      <video
        controls
        src={document.file_url}
        className="aspect-video w-full rounded-xl bg-black"
      />
    );
  }

  if (document.doc_type === "IMAGE") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={document.file_url}
        alt={document.title}
        className="max-h-[520px] w-full rounded-xl object-contain bg-gray-50"
      />
    );
  }

  if (document.doc_type === "OTHER") {
    return (
      <audio controls src={document.file_url} className="w-full">
        Your browser does not support this audio file.
      </audio>
    );
  }

  if (document.doc_type === "PDF") {
    return (
      <iframe
        src={document.file_url}
        title={document.title}
        className="w-full rounded-xl border border-gray-200"
        style={{ height: "75vh" }}
      />
    );
  }

  return (
    <iframe
      src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(document.file_url)}`}
      title={document.title}
      className="w-full rounded-xl border border-gray-200"
      style={{ height: "75vh" }}
    />
  );
}

export default function ModulePage() {
  const params = useParams();
  const courseId = Number(params.id);
  const moduleId = Number(params.moduleId);

  const [staffCourse, setStaffCourse] = useState<StaffCourse | null>(null);
  const [currentModule, setCurrentModule] = useState<CourseModule | null>(null);
  const [activeDocument, setActiveDocument] = useState<ModuleDocument | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [savingDocumentId, setSavingDocumentId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = async () => {
    const courseData = await loadStaffCourse(courseId);
    const moduleData =
      courseData?.modules.find((module) => module.id === moduleId) ?? null;

    setStaffCourse(courseData);
    setCurrentModule(moduleData);
    setActiveDocument((current) => current ?? moduleData?.documents[0] ?? null);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        await loadData();
        setError("");
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load this module.",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, moduleId]);

  const moduleIndex = useMemo(
    () =>
      staffCourse?.modules.findIndex((module) => module.id === moduleId) ?? -1,
    [moduleId, staffCourse?.modules],
  );
  const previousModule =
    moduleIndex > 0 ? staffCourse?.modules[moduleIndex - 1] : null;
  const nextModule =
    staffCourse && moduleIndex >= 0 && moduleIndex < staffCourse.modules.length - 1
      ? staffCourse.modules[moduleIndex + 1]
      : null;
  const previousRoute = previousModule
    ? `/staff/course/${courseId}/module/${previousModule.id}`
    : `/staff/course/${courseId}`;
  const nextRoute = nextModule
    ? `/staff/course/${courseId}/module/${nextModule.id}`
    : `/staff/course/${courseId}/assessment/post-test`;

  const handleCompleteDocument = async (document: ModuleDocument) => {
    if (!staffCourse) return;

    setSavingDocumentId(document.id);
    setError("");
    setNotice("");

    try {
      await markDocumentComplete(staffCourse.enrollment.id, document.id);
      await loadData();
      setNotice(`"${document.title}" marked as completed.`);
    } catch (completeError) {
      setError(
        completeError instanceof Error
          ? completeError.message
          : "Could not mark this document complete.",
      );
    } finally {
      setSavingDocumentId(null);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading module...</div>;
  }

  if (error && (!staffCourse || !currentModule)) {
    return (
      <div className="p-6">
        <div className="rounded-xl bg-white p-6">
          <h2 className="text-xl font-bold text-red-600">Module not found</h2>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!staffCourse || !currentModule) {
    return (
      <div className="p-6">
        <div className="rounded-xl bg-white p-6">
          <h2 className="text-xl font-bold text-red-600">Module not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <Link
        href={`/staff/course/${courseId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-[#1a6b3c]"
      >
        <ArrowLeft size={16} /> Back to Course
      </Link>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
          {notice}
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        {/* The course thumbnail is intentionally NOT shown here — it belongs
            to the course, and displaying it on every module made it look
            like module content. */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              {staffCourse.enrollment.course_title}
            </p>
            <h1 className="mb-3 text-2xl font-bold text-gray-800 sm:text-3xl">
              {currentModule.title}
            </h1>
            <p className="max-w-3xl text-base text-gray-600">
              {currentModule.description || "No description has been added."}
            </p>
          </div>
        </div>

        {activeDocument ? (
          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-bold text-gray-800">
                {activeDocument.title}
              </h2>
            </div>
            <DocumentPreview document={activeDocument} />
          </div>
        ) : (
          <div className="mb-8 rounded-xl bg-gray-50 p-8 text-center">
            <FileText className="mx-auto mb-3 text-gray-300" size={42} />
            <p className="font-semibold text-gray-700">
              No document uploaded yet.
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Once admin uploads materials, they will show here.
            </p>
          </div>
        )}

        {currentModule.notes && (
          <div className="mb-8 rounded-xl border border-gray-100 bg-gray-50 p-6 sm:p-8">
            <h2 className="mb-4 text-lg font-bold text-gray-800">
              Lesson Notes
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700 sm:text-base">
              {currentModule.notes}
            </p>
          </div>
        )}

        <div className="mb-10 grid gap-4 sm:grid-cols-2">
          {currentModule.documents.map((document) => {
            const completed = documentIsComplete(
              staffCourse.enrollment,
              document.id,
            );
            const active = activeDocument?.id === document.id;

            return (
              <div
                key={document.id}
                className={`rounded-xl border p-5 transition ${
                  active
                    ? "border-[#1a6b3c] bg-green-50"
                    : "border-gray-200 hover:border-[#1a6b3c] hover:bg-green-50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveDocument(document)}
                  className="flex w-full items-center gap-4 text-left"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-[#1a6b3c] shadow-sm">
                    <DocumentIcon type={document.doc_type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-gray-800">
                      {document.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {document.doc_type}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={completed || savingDocumentId === document.id}
                  onClick={() => handleCompleteDocument(document)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#1a6b3c] px-3 py-2 text-sm font-semibold text-[#1a6b3c] transition hover:bg-[#1a6b3c] hover:text-white disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <CheckCircle2 size={16} />
                  {completed
                    ? "Completed"
                    : savingDocumentId === document.id
                      ? "Saving..."
                      : "Mark as complete"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col-reverse justify-between gap-4 border-t border-gray-100 pt-6 sm:flex-row sm:items-center">
          <Link
            href={previousRoute}
            className="text-center text-sm font-medium text-gray-500 transition hover:text-gray-800 sm:text-left"
          >
            {previousModule ? "← Previous Module" : "← Course Overview"}
          </Link>
          <Link
            href={nextRoute}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#1a6b3c] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[#145530]"
          >
            <CheckCircle2 size={18} />
            {nextModule ? "Continue" : "Proceed"}
          </Link>
        </div>
      </div>
    </div>
  );
}
