"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Headphones,
  Image as ImageIcon,
  Menu,
  MonitorPlay,
  PlayCircle,
  Presentation,
  X,
} from "lucide-react";
import RichTextViewer from "@/app/components/RichTextViewer";
import {
  documentIsComplete,
  loadAssessments,
  loadStaffCourse,
  markDocumentComplete,
  type Assessment,
  type ModuleDocument,
  type StaffCourse,
} from "@/app/lib/staff-learning";

// ---------------------------------------------------------------------------
// Outline model: the course flattened into an ordered list of player items —
// optional pre-test, every module's materials in order, optional post-test.
// ---------------------------------------------------------------------------

type DocItem = {
  key: string;
  kind: "doc";
  moduleId: number;
  moduleTitle: string;
  doc: ModuleDocument;
};

type AssessmentItem = {
  key: string;
  kind: "assessment";
  type: "pre-test" | "post-test";
  assessment: Assessment;
};

type PlayerItem = DocItem | AssessmentItem;

const AUDIO_URL_PATTERN = /\.(mp3|wav|m4a|aac|ogg|oga|opus)(\?|#|$)/i;

function documentUrl(doc: ModuleDocument) {
  return doc.content_url ?? doc.file_url ?? "";
}

/**
 * What this material actually is, preferring the new-model content_type and
 * falling back to the legacy doc_type (with an audio sniff for OTHER).
 */
type DocumentKind =
  | "VIDEO"
  | "PDF"
  | "IMAGE"
  | "AUDIO"
  | "TEXT"
  | "ASSESSMENT"
  | "OTHER";

function documentKind(doc: ModuleDocument): DocumentKind {
  switch (doc.content_type) {
    case "VIDEO":
      return "VIDEO";
    case "PDF":
      return "PDF";
    case "AUDIO":
      return "AUDIO";
    case "TEXT":
      return "TEXT";
    case "ASSESSMENT":
      return "ASSESSMENT";
    case "PPT":
    case "EXTERNAL":
      return "OTHER";
  }

  switch (doc.doc_type) {
    case "VIDEO":
      return "VIDEO";
    case "PDF":
      return "PDF";
    case "IMAGE":
      return "IMAGE";
    case "PPT":
      return "OTHER";
    default:
      if (doc.text_content && !documentUrl(doc)) return "TEXT";
      return AUDIO_URL_PATTERN.test(documentUrl(doc)) ? "AUDIO" : "OTHER";
  }
}

function documentIcon(doc: ModuleDocument) {
  switch (documentKind(doc)) {
    case "VIDEO":
      return PlayCircle;
    case "PDF":
    case "TEXT":
      return FileText;
    case "IMAGE":
      return ImageIcon;
    case "AUDIO":
      return Headphones;
    case "ASSESSMENT":
      return ClipboardCheck;
    default:
      return doc.doc_type === "PPT" ? Presentation : ExternalLink;
  }
}

// Renders one material by its resolved kind. Text lessons, videos, PDFs,
// images and audio play inside the pane; slides and other files open in a
// new tab.
function DocumentContent({ doc }: { doc: ModuleDocument }) {
  const kind = documentKind(doc);
  const url = documentUrl(doc);

  if (kind === "TEXT") {
    return doc.text_content ? (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <RichTextViewer html={doc.text_content} />
      </div>
    ) : (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-500">
        <FileText size={26} className="mx-auto mb-3 text-gray-400" />
        This lesson&apos;s content has not been published yet.
      </div>
    );
  }

  if (!url) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-500">
        <FileText size={26} className="mx-auto mb-3 text-gray-400" />
        This material&apos;s content has not been uploaded yet.
      </div>
    );
  }

  if (kind === "VIDEO") {
    return (
      <video
        controls
        src={url}
        className="aspect-video w-full rounded-xl bg-black shadow-sm"
      />
    );
  }

  if (kind === "PDF") {
    return (
      <iframe
        src={url}
        title={doc.title}
        className="h-[70vh] w-full rounded-xl border border-gray-200 bg-white shadow-sm"
      />
    );
  }

  if (kind === "IMAGE") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={doc.title}
        className="max-h-[70vh] w-full rounded-xl border border-gray-200 object-contain shadow-sm"
      />
    );
  }

  if (kind === "AUDIO") {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <Headphones size={26} className="mb-4 text-[#1a6b3c]" />
        <p className="mb-4 text-sm font-medium text-gray-700">{doc.title}</p>
        <audio controls src={url} className="w-full">
          Your browser does not support this audio file.
        </audio>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-10 text-center">
      <ExternalLink size={26} className="mx-auto mb-3 text-[#1a6b3c]" />
      <p className="mb-5 text-sm text-gray-600">
        This material opens in a new tab.
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#145530]"
      >
        <ExternalLink size={16} /> Open Resource
      </a>
    </div>
  );
}

function CoursePlayer() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = Number(params.id);

  const [staffCourse, setStaffCourse] = useState<StaffCourse | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(
    new Set(),
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const contentRef = useRef<HTMLDivElement | null>(null);

  const items = useMemo<PlayerItem[]>(() => {
    if (!staffCourse) return [];

    const list: PlayerItem[] = [];
    const preTest = assessments.find((item) => item.type === "PRE_TEST");
    const postTest = assessments.find((item) => item.type === "POST_TEST");

    if (preTest) {
      list.push({
        key: "assessment-pre",
        kind: "assessment",
        type: "pre-test",
        assessment: preTest,
      });
    }

    for (const courseModule of staffCourse.modules) {
      const sortedDocs = courseModule.documents
        .slice()
        .sort((first, second) => first.order - second.order);

      for (const doc of sortedDocs) {
        list.push({
          key: `doc-${doc.id}`,
          kind: "doc",
          moduleId: courseModule.id,
          moduleTitle: courseModule.title,
          doc,
        });
      }
    }

    if (postTest) {
      list.push({
        key: "assessment-post",
        kind: "assessment",
        type: "post-test",
        assessment: postTest,
      });
    }

    return list;
  }, [staffCourse, assessments]);

  const currentIndex = items.findIndex((item) => item.key === currentKey);
  const currentItem = currentIndex >= 0 ? items[currentIndex] : null;
  const docItems = useMemo(
    () => items.filter((item): item is DocItem => item.kind === "doc"),
    [items],
  );
  const totalDocs = docItems.length;
  const completedDocs = docItems.filter((item) =>
    completedIds.has(item.doc.id),
  ).length;
  const progress =
    totalDocs === 0 ? 0 : Math.round((completedDocs / totalDocs) * 100);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseData, assessmentData] = await Promise.all([
          loadStaffCourse(courseId),
          loadAssessments(courseId).catch(() => []),
        ]);

        if (!courseData) {
          setError("This course is not assigned to you.");
          return;
        }

        setStaffCourse(courseData);
        setAssessments(assessmentData);
        setExpandedModules(
          new Set(courseData.modules.map((module) => module.id)),
        );

        const done = new Set<number>();
        for (const courseModule of courseData.modules) {
          for (const doc of courseModule.documents) {
            if (documentIsComplete(courseData.enrollment, doc.id)) {
              done.add(doc.id);
            }
          }
        }
        setCompletedIds(done);

        // Land on the deep-linked material, else the first incomplete one,
        // else the very first item (resume behaviour).
        const requestedDocId = Number(searchParams.get("doc"));
        const allDocs = courseData.modules
          .slice()
          .sort((first, second) => first.order - second.order)
          .flatMap((module) =>
            module.documents
              .slice()
              .sort((first, second) => first.order - second.order),
          );

        const requested = allDocs.find((doc) => doc.id === requestedDocId);
        const firstIncomplete = allDocs.find((doc) => !done.has(doc.id));
        const landing = requested ?? firstIncomplete ?? allDocs[0];

        if (landing) {
          setCurrentKey(`doc-${landing.id}`);
        } else if (assessmentData.length > 0) {
          setCurrentKey(
            assessmentData.some((item) => item.type === "PRE_TEST")
              ? "assessment-pre"
              : "assessment-post",
          );
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load this course.",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
    // searchParams is only read once for the initial landing item.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const goTo = (key: string) => {
    setCurrentKey(key);
    setSidebarOpen(false);
    setNotice("");

    const target = items.find((item) => item.key === key);
    if (target?.kind === "doc") {
      setExpandedModules((current) => new Set(current).add(target.moduleId));
    }

    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const markComplete = async (doc: ModuleDocument) => {
    if (!staffCourse || completedIds.has(doc.id)) return;

    // Optimistic tick; reverted if the backend rejects it.
    setCompletedIds((current) => new Set(current).add(doc.id));

    try {
      const result = await markDocumentComplete(
        staffCourse.enrollment.id,
        doc.id,
      );

      // The backend returns just the recalculated progress — merge it into
      // the enrollment we already hold.
      if (result) {
        setStaffCourse((current) =>
          current
            ? {
                ...current,
                enrollment: {
                  ...current.enrollment,
                  completion_percentage:
                    result.completionPercentage ??
                    current.enrollment.completion_percentage,
                  status: result.courseStatus ?? current.enrollment.status,
                },
              }
            : current,
        );
      }
    } catch (markError) {
      setCompletedIds((current) => {
        const next = new Set(current);
        next.delete(doc.id);
        return next;
      });
      setNotice(
        markError instanceof Error
          ? markError.message
          : "Could not save your progress. Please try again.",
      );
    }
  };

  const goNext = () => {
    // Assessment activities complete by passing the assessment, not by
    // clicking past them.
    if (
      currentItem?.kind === "doc" &&
      documentKind(currentItem.doc) !== "ASSESSMENT"
    ) {
      void markComplete(currentItem.doc);
    }

    if (currentIndex < items.length - 1) {
      goTo(items[currentIndex + 1].key);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      goTo(items[currentIndex - 1].key);
    }
  };

  // Keyboard navigation, like a real course player.
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrev();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // goNext/goPrev re-close over fresh state every render; re-binding on
    // index/items keeps the handlers current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, items]);

  const toggleModule = (moduleId: number) => {
    setExpandedModules((current) => {
      const next = new Set(current);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#1a6b3c]" />
          <p className="text-sm font-medium text-gray-500">
            Loading your course...
          </p>
        </div>
      </div>
    );
  }

  if (error || !staffCourse) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white p-6">
        <div className="max-w-md text-center">
          <AlertCircle size={32} className="mx-auto mb-3 text-red-500" />
          <h2 className="mb-2 text-lg font-bold text-gray-800">
            Course not available
          </h2>
          <p className="mb-6 text-sm text-gray-500">
            {error || "This course is not assigned to you."}
          </p>
          <Link
            href="/staff/training"
            className="inline-flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#145530]"
          >
            Back to My Training
          </Link>
        </div>
      </div>
    );
  }

  const preTestItem = items.find(
    (item): item is AssessmentItem => item.key === "assessment-pre",
  );
  const postTestItem = items.find(
    (item): item is AssessmentItem => item.key === "assessment-post",
  );

  const renderAssessmentRow = (item: AssessmentItem) => (
    <button
      type="button"
      onClick={() => goTo(item.key)}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
        currentKey === item.key
          ? "bg-[#e3f2ea] font-semibold text-[#1a6b3c]"
          : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      <ClipboardCheck size={16} className="shrink-0 text-[#1a6b3c]" />
      <span className="min-w-0 flex-1 truncate">{item.assessment.title}</span>
      <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
        {item.type === "pre-test" ? "Pre-test" : "Post-test"}
      </span>
    </button>
  );

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-100 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Course Outline
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-[#1a6b3c] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-bold text-[#1a6b3c]">{progress}%</span>
        </div>
        <p className="mt-1.5 text-[11px] text-gray-400">
          {completedDocs} of {totalDocs} materials completed
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {preTestItem && renderAssessmentRow(preTestItem)}

        {staffCourse.modules.map((module, moduleIndex) => {
          const moduleDocs = module.documents
            .slice()
            .sort((first, second) => first.order - second.order);
          const moduleCompleted = moduleDocs.filter((doc) =>
            completedIds.has(doc.id),
          ).length;
          const isExpanded = expandedModules.has(module.id);
          const isModuleDone =
            moduleDocs.length > 0 && moduleCompleted === moduleDocs.length;

          return (
            <div key={module.id} className="rounded-xl">
              <button
                type="button"
                onClick={() => toggleModule(module.id)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition hover:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-800">
                    Module {moduleIndex + 1}: {module.title}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 w-24 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isModuleDone ? "bg-green-500" : "bg-[#1a6b3c]"
                        }`}
                        style={{
                          width: `${
                            moduleDocs.length === 0
                              ? 0
                              : (moduleCompleted / moduleDocs.length) * 100
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-gray-400">
                      {moduleCompleted}/{moduleDocs.length}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-gray-400 transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isExpanded && (
                <div className="ml-2 space-y-0.5 border-l-2 border-gray-100 pl-2">
                  {moduleDocs.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-gray-400">
                      No materials yet.
                    </p>
                  ) : (
                    moduleDocs.map((doc) => {
                      const Icon = documentIcon(doc);
                      const key = `doc-${doc.id}`;
                      const isDone = completedIds.has(doc.id);
                      const isCurrent = currentKey === key;

                      return (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => goTo(key)}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
                            isCurrent
                              ? "bg-[#e3f2ea] font-semibold text-[#1a6b3c]"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2
                              size={16}
                              className="shrink-0 text-green-500"
                            />
                          ) : (
                            <Icon
                              size={16}
                              className={`shrink-0 ${
                                isCurrent ? "text-[#1a6b3c]" : "text-gray-400"
                              }`}
                            />
                          )}
                          <span className="min-w-0 flex-1 truncate">
                            {doc.title}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}

        {postTestItem && renderAssessmentRow(postTestItem)}
      </nav>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4">
        <button
          type="button"
          aria-label="Toggle course outline"
          onClick={() => setSidebarOpen((current) => !current)}
          className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 lg:hidden"
        >
          <Menu size={20} />
        </button>

        <MonitorPlay size={20} className="hidden shrink-0 text-[#1a6b3c] sm:block" />
        <h1 className="min-w-0 flex-1 truncate text-sm font-bold text-gray-800 sm:text-base">
          {staffCourse.enrollment.course_title}
        </h1>

        <div className="hidden items-center gap-2 md:flex">
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-[#1a6b3c] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-bold text-gray-500">{progress}%</span>
        </div>

        <button
          type="button"
          aria-label="Close course player"
          onClick={() => router.push(`/staff/course/${courseId}`)}
          className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
        >
          <X size={20} />
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar — fixed on desktop, drawer on mobile */}
        <aside className="hidden w-80 shrink-0 border-r border-gray-200 bg-white lg:block">
          {sidebar}
        </aside>

        {sidebarOpen && (
          <>
            <div
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 top-14 z-40 bg-black/40 lg:hidden"
            />
            <aside className="fixed bottom-0 left-0 top-14 z-50 w-80 max-w-[85vw] bg-white shadow-2xl lg:hidden">
              {sidebar}
            </aside>
          </>
        )}

        {/* Content pane */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div ref={contentRef} className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
              {notice && (
                <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {notice}
                </div>
              )}

              {currentItem?.kind === "doc" &&
                (documentKind(currentItem.doc) === "ASSESSMENT" ? (
                  (() => {
                    const linkedAssessment = assessments.find(
                      (assessment) =>
                        assessment.id ===
                        (currentItem.doc.assessment_id ??
                          currentItem.doc.assessment),
                    );

                    return (
                      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-12">
                        <ClipboardCheck
                          size={36}
                          className="mx-auto mb-4 text-[#1a6b3c]"
                        />
                        <p className="text-xs font-semibold uppercase tracking-widest text-[#1a6b3c]">
                          {currentItem.moduleTitle}
                        </p>
                        <h2 className="mt-2 text-xl font-bold text-gray-800 sm:text-2xl">
                          {currentItem.doc.title}
                        </h2>
                        {linkedAssessment ? (
                          <>
                            <p className="mx-auto mt-3 max-w-md text-sm text-gray-500">
                              {linkedAssessment.questions.length} question(s) •
                              Pass mark {linkedAssessment.pass_mark}%. Your
                              camera will verify your identity before it
                              starts.
                            </p>
                            <Link
                              href={`/staff/course/${courseId}/assessment/${
                                linkedAssessment.type === "PRE_TEST"
                                  ? "pre-test"
                                  : "post-test"
                              }`}
                              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1a6b3c] px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#145530]"
                            >
                              <PlayCircle size={17} /> Take Assessment
                            </Link>
                          </>
                        ) : (
                          <p className="mx-auto mt-3 max-w-md text-sm text-gray-500">
                            This assessment has not been fully configured yet.
                            Please check back later.
                          </p>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {currentItem.moduleTitle}
                    </p>
                    <div className="mb-5 mt-1 flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-xl font-bold text-gray-800 sm:text-2xl">
                        {currentItem.doc.title}
                      </h2>
                      <button
                        type="button"
                        onClick={() => void markComplete(currentItem.doc)}
                        disabled={completedIds.has(currentItem.doc.id)}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                          completedIds.has(currentItem.doc.id)
                            ? "bg-green-100 text-green-700"
                            : "border border-[#1a6b3c] text-[#1a6b3c] hover:bg-green-50"
                        }`}
                      >
                        <CheckCircle2 size={14} />
                        {completedIds.has(currentItem.doc.id)
                          ? "Completed"
                          : "Mark as complete"}
                      </button>
                    </div>

                    <DocumentContent doc={currentItem.doc} />
                  </>
                ))}

              {currentItem?.kind === "assessment" && (
                <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-12">
                  {currentItem.type === "post-test" && progress >= 100 && (
                    <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-1.5 text-xs font-bold text-green-700">
                      <Award size={14} /> All materials completed — well done!
                    </p>
                  )}
                  <ClipboardCheck
                    size={36}
                    className="mx-auto mb-4 text-[#1a6b3c]"
                  />
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#1a6b3c]">
                    {currentItem.type === "pre-test"
                      ? "Before the modules"
                      : "After the modules"}
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-gray-800 sm:text-2xl">
                    {currentItem.assessment.title}
                  </h2>
                  <p className="mx-auto mt-3 max-w-md text-sm text-gray-500">
                    {currentItem.assessment.description ||
                      (currentItem.type === "pre-test"
                        ? "A short check of what you already know. Your camera will verify your identity before it starts."
                        : "Pass this assessment to complete the course. Your camera will verify your identity before it starts.")}
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    {currentItem.assessment.questions.length} question(s) • Pass
                    mark {currentItem.assessment.pass_mark}%
                  </p>
                  <Link
                    href={`/staff/course/${courseId}/assessment/${currentItem.type}`}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1a6b3c] px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#145530]"
                  >
                    <PlayCircle size={17} /> Take Assessment
                  </Link>
                </div>
              )}

              {!currentItem && (
                <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
                  No learning materials have been added to this course yet.
                </div>
              )}
            </div>
          </div>

          {/* Prev / Next footer */}
          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3 sm:px-8">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentIndex <= 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-[#1a6b3c] hover:text-[#1a6b3c] disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-600"
            >
              <ChevronLeft size={16} /> Previous
            </button>

            <span className="hidden text-xs font-medium text-gray-400 sm:block">
              {currentIndex >= 0
                ? `Item ${currentIndex + 1} of ${items.length}`
                : ""}
            </span>

            <button
              type="button"
              onClick={goNext}
              disabled={currentIndex >= items.length - 1}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a6b3c] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#145530] disabled:opacity-40"
            >
              Next <ChevronRight size={16} />
            </button>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default function CoursePlayerPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
          <p className="text-sm font-medium text-gray-500">
            Loading your course...
          </p>
        </div>
      }
    >
      <CoursePlayer />
    </Suspense>
  );
}
