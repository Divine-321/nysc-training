"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Award,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  ExternalLink,
  FileText,
  Headphones,
  Image as ImageIcon,
  Menu,
  MonitorPlay,
  PlayCircle,
  Presentation,
  UserCheck,
  Video,
  X,
} from "lucide-react";
import RichTextViewer from "@/app/components/RichTextViewer";
import {
  documentIsComplete,
  loadAssessments,
  loadLiveSessionsForCourse,
  loadStaffCourse,
  markDocumentComplete,
  type Assessment,
  type LiveSession,
  type ModuleDocument,
  type StaffCourse,
} from "@/app/lib/staff-learning";
import { extractErrorMessage, readApiItem } from "@/app/lib/portal-api";
import { formatDateTime } from "@/app/lib/format";

// ---------------------------------------------------------------------------
// Per-module learning model. Each module is one focused section whose items
// appear in a fixed order: Pre-Test → Activities (configured order) → Live
// Session → Post-Test (any missing item is simply omitted). Assessments and
// live sessions belong to their module (assessment.module / session.module).
// ---------------------------------------------------------------------------

type DocItem = {
  key: string;
  kind: "doc";
  moduleId: number;
  moduleIndex: number;
  doc: ModuleDocument;
};

type AssessmentItem = {
  key: string;
  kind: "assessment";
  moduleId: number;
  moduleIndex: number;
  phase: "pre" | "post";
  assessment: Assessment;
};

type LiveItem = {
  key: string;
  kind: "live";
  moduleId: number;
  moduleIndex: number;
  session: LiveSession;
};

type PlayerItem = DocItem | AssessmentItem | LiveItem;

type ModuleSection = {
  moduleId: number;
  moduleIndex: number;
  title: string;
  trainer: string | null;
  items: PlayerItem[];
};

const AUDIO_URL_PATTERN = /\.(mp3|wav|m4a|aac|ogg|oga|opus)(\?|#|$)/i;

function documentUrl(doc: ModuleDocument) {
  return doc.content_url ?? doc.file_url ?? "";
}

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

function itemIcon(item: PlayerItem) {
  if (item.kind === "assessment") return ClipboardCheck;
  if (item.kind === "live") return Video;
  return documentIcon(item.doc);
}

function itemTitle(item: PlayerItem) {
  if (item.kind === "assessment") {
    return item.phase === "pre" ? "Pre-Test" : "Post-Test";
  }
  if (item.kind === "live") return item.session.title || "Live Session";
  return item.doc.title;
}

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
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [moduleSwitcherOpen, setModuleSwitcherOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [joiningSessionId, setJoiningSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Build the per-module sections in the fixed learning order.
  const sections = useMemo<ModuleSection[]>(() => {
    if (!staffCourse) return [];

    const orderedModules = staffCourse.modules
      .slice()
      .sort((first, second) => first.order - second.order);

    const built: ModuleSection[] = orderedModules.map((module, moduleIndex) => {
      const items: PlayerItem[] = [];

      // 1. Pre-Test (this module's PRE_TEST assessment).
      const preTest = assessments.find(
        (assessment) =>
          assessment.type === "PRE_TEST" && assessment.module === module.id,
      );
      if (preTest) {
        items.push({
          key: `pre-${module.id}`,
          kind: "assessment",
          moduleId: module.id,
          moduleIndex,
          phase: "pre",
          assessment: preTest,
        });
      }

      // 2. Activities in their configured order.
      for (const doc of module.documents
        .slice()
        .sort((first, second) => first.order - second.order)) {
        items.push({
          key: `doc-${doc.id}`,
          kind: "doc",
          moduleId: module.id,
          moduleIndex,
          doc,
        });
      }

      // 3. Live session(s) tagged with this module.
      for (const session of liveSessions.filter(
        (item) => item.module === module.id,
      )) {
        items.push({
          key: `live-${session.id}`,
          kind: "live",
          moduleId: module.id,
          moduleIndex,
          session,
        });
      }

      // 4. Post-Test (this module's POST_TEST assessment).
      const postTest = assessments.find(
        (assessment) =>
          assessment.type === "POST_TEST" && assessment.module === module.id,
      );
      if (postTest) {
        items.push({
          key: `post-${module.id}`,
          kind: "assessment",
          moduleId: module.id,
          moduleIndex,
          phase: "post",
          assessment: postTest,
        });
      }

      return {
        moduleId: module.id,
        moduleIndex,
        title: module.title,
        trainer: module.trainers?.[0]?.full_name ?? null,
        items,
      };
    });

    // Legacy fallback: assessments with no module (old course-level tests)
    // bookend the whole course — pre on the first module, post on the last.
    const orphanPre = assessments.find(
      (assessment) => assessment.type === "PRE_TEST" && assessment.module == null,
    );
    const orphanPost = assessments.find(
      (assessment) =>
        assessment.type === "POST_TEST" && assessment.module == null,
    );

    if (orphanPre && built[0]) {
      built[0].items.unshift({
        key: `pre-orphan`,
        kind: "assessment",
        moduleId: built[0].moduleId,
        moduleIndex: 0,
        phase: "pre",
        assessment: orphanPre,
      });
    }
    if (orphanPost && built.length > 0) {
      const last = built[built.length - 1];
      last.items.push({
        key: `post-orphan`,
        kind: "assessment",
        moduleId: last.moduleId,
        moduleIndex: last.moduleIndex,
        phase: "post",
        assessment: orphanPost,
      });
    }

    return built;
  }, [staffCourse, assessments, liveSessions]);

  const items = useMemo(
    () => sections.flatMap((section) => section.items),
    [sections],
  );

  // Falls back to the first item until the learner navigates, without needing
  // an effect to seed state (avoids cascading re-renders).
  const effectiveKey = currentKey ?? items[0]?.key ?? null;
  const currentIndex = items.findIndex((item) => item.key === effectiveKey);
  const currentItem = currentIndex >= 0 ? items[currentIndex] : null;
  const currentSection = currentItem
    ? (sections.find(
        (section) => section.moduleId === currentItem.moduleId,
      ) ?? null)
    : (sections[0] ?? null);

  // Progress — course-wide and per (current) module, counted from real docs.
  const allDocs = useMemo(
    () => items.filter((item): item is DocItem => item.kind === "doc"),
    [items],
  );
  const totalDocs = allDocs.length;
  const completedDocs = allDocs.filter((item) =>
    completedIds.has(item.doc.id),
  ).length;
  const progress =
    totalDocs === 0 ? 0 : Math.round((completedDocs / totalDocs) * 100);

  const sectionDocs = (currentSection?.items ?? []).filter(
    (item): item is DocItem => item.kind === "doc",
  );
  const sectionCompleted = sectionDocs.filter((item) =>
    completedIds.has(item.doc.id),
  ).length;
  const sectionProgress =
    sectionDocs.length === 0
      ? 0
      : Math.round((sectionCompleted / sectionDocs.length) * 100);

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

        // Live sessions belong to this enrollment's programme delivery.
        void loadLiveSessionsForCourse([courseData.enrollment.cohort_course])
          .then((sessions) => setLiveSessions(sessions))
          .catch(() => setLiveSessions([]));

        const done = new Set<number>();
        for (const courseModule of courseData.modules) {
          for (const doc of courseModule.documents) {
            if (documentIsComplete(courseData.enrollment, doc.id)) {
              done.add(doc.id);
            }
          }
        }
        setCompletedIds(done);

        // Land on the deep-linked material or module, else the first
        // incomplete material, else the very first item (resume behaviour).
        const requestedDocId = Number(searchParams.get("doc"));
        const requestedModuleId = Number(searchParams.get("module"));
        const orderedDocs = courseData.modules
          .slice()
          .sort((first, second) => first.order - second.order)
          .flatMap((module) =>
            module.documents
              .slice()
              .sort((first, second) => first.order - second.order),
          );

        const requestedModule = courseData.modules.find(
          (module) => module.id === requestedModuleId,
        );

        if (requestedModule) {
          // Resume inside the requested module: its first incomplete
          // material, else its first material, else its pre/post-test.
          const moduleDocs = requestedModule.documents
            .slice()
            .sort((first, second) => first.order - second.order);
          const moduleLanding =
            moduleDocs.find((doc) => !done.has(doc.id)) ?? moduleDocs[0];

          if (moduleLanding) {
            setCurrentKey(`doc-${moduleLanding.id}`);
          } else if (
            assessmentData.some(
              (item) =>
                item.type === "PRE_TEST" && item.module === requestedModule.id,
            )
          ) {
            setCurrentKey(`pre-${requestedModule.id}`);
          } else if (
            assessmentData.some(
              (item) =>
                item.type === "POST_TEST" && item.module === requestedModule.id,
            )
          ) {
            setCurrentKey(`post-${requestedModule.id}`);
          }
        } else {
          const requested = orderedDocs.find(
            (doc) => doc.id === requestedDocId,
          );
          const firstIncomplete = orderedDocs.find((doc) => !done.has(doc.id));
          const landing = requested ?? firstIncomplete ?? orderedDocs[0];

          if (landing) {
            setCurrentKey(`doc-${landing.id}`);
          }
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
    setModuleSwitcherOpen(false);
    setNotice("");
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToModule = (moduleId: number) => {
    const section = sections.find((item) => item.moduleId === moduleId);
    if (!section || section.items.length === 0) return;

    // Resume at the module's first incomplete doc, else its first item.
    const firstIncomplete = section.items.find(
      (item) => item.kind === "doc" && !completedIds.has(item.doc.id),
    );
    goTo((firstIncomplete ?? section.items[0]).key);
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
    // Reading materials auto-complete when you move past them; assessments
    // and live sessions complete through their own flow.
    if (
      currentItem?.kind === "doc" &&
      documentKind(currentItem.doc) !== "ASSESSMENT"
    ) {
      void markComplete(currentItem.doc);
    }

    if (currentIndex >= 0 && currentIndex < items.length - 1) {
      goTo(items[currentIndex + 1].key);
    } else {
      // Reached the end of the course.
      router.push(`/staff/course/${courseId}`);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, items]);

  const handleJoinSession = async (session: LiveSession) => {
    setJoiningSessionId(session.id);
    setNotice("");

    // Open the tab before awaiting so popup blockers allow it.
    const meetingTab = window.open("about:blank", "_blank");

    try {
      const response = await fetch(
        `/api/training/live-sessions/${session.id}/join`,
        { method: "POST" },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not join this live session."),
        );
      }

      const joinData = readApiItem<{ meeting_url?: string }>(payload);

      if (!joinData?.meeting_url) {
        throw new Error(
          "Attendance was recorded, but no meeting link was returned.",
        );
      }

      if (meetingTab) {
        meetingTab.location.href = joinData.meeting_url;
      } else {
        window.open(joinData.meeting_url, "_blank", "noopener,noreferrer");
      }
    } catch (joinError) {
      meetingTab?.close();
      setNotice(
        joinError instanceof Error
          ? joinError.message
          : "Could not join this live session.",
      );
    } finally {
      setJoiningSessionId(null);
    }
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
            Back to My Courses
          </Link>
        </div>
      </div>
    );
  }

  const nextItem =
    currentIndex >= 0 && currentIndex < items.length - 1
      ? items[currentIndex + 1]
      : null;
  const prevItem = currentIndex > 0 ? items[currentIndex - 1] : null;
  const nextCrossesModule =
    nextItem != null &&
    currentItem != null &&
    nextItem.moduleId !== currentItem.moduleId;
  const prevCrossesModule =
    prevItem != null &&
    currentItem != null &&
    prevItem.moduleId !== currentItem.moduleId;

  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Module header + switcher */}
      <div className="border-b border-gray-100 p-4">
        <button
          type="button"
          onClick={() => router.push(`/staff/course/${courseId}`)}
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 transition hover:text-[#1a6b3c]"
        >
          <ChevronLeft size={13} /> Course overview
        </button>

        {currentSection ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setModuleSwitcherOpen((open) => !open)}
              className="flex w-full items-start justify-between gap-2 rounded-lg text-left"
              aria-expanded={moduleSwitcherOpen}
            >
              <span className="min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Module {currentSection.moduleIndex + 1} of {sections.length}
                </span>
                <span className="mt-0.5 block truncate text-sm font-bold text-gray-800">
                  {currentSection.title}
                </span>
              </span>
              <ChevronRight
                size={16}
                className={`mt-0.5 shrink-0 text-gray-400 transition-transform ${
                  moduleSwitcherOpen ? "rotate-90" : ""
                }`}
              />
            </button>

            {currentSection.trainer ? (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                <UserCheck size={12} className="text-[#1a6b3c]" />
                {currentSection.trainer}
              </p>
            ) : null}

            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    sectionProgress >= 100 ? "bg-green-500" : "bg-[#1a6b3c]"
                  }`}
                  style={{ width: `${sectionProgress}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-gray-500">
                {sectionCompleted}/{sectionDocs.length}
              </span>
            </div>

            {moduleSwitcherOpen ? (
              <div className="absolute left-0 right-0 top-full z-10 mt-2 max-h-72 overflow-y-auto rounded-xl border border-gray-100 bg-white p-1.5 shadow-lg">
                {sections.map((section) => {
                  const secDocs = section.items.filter(
                    (item) => item.kind === "doc",
                  );
                  const secDone = secDocs.filter(
                    (item) =>
                      item.kind === "doc" && completedIds.has(item.doc.id),
                  ).length;
                  const done =
                    secDocs.length > 0 && secDone === secDocs.length;
                  const isCurrent = section.moduleId === currentSection.moduleId;

                  return (
                    <button
                      key={section.moduleId}
                      type="button"
                      onClick={() => goToModule(section.moduleId)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
                        isCurrent ? "bg-[#e3f2ea]" : "hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          done
                            ? "bg-green-500 text-white"
                            : isCurrent
                              ? "bg-[#1a6b3c] text-white"
                              : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {done ? <CheckCircle2 size={13} /> : section.moduleIndex + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700">
                        {section.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Current module's items only */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {(currentSection?.items ?? []).length === 0 ? (
          <p className="px-3 py-2 text-xs text-gray-400">
            This module has no learning items yet.
          </p>
        ) : (
          (currentSection?.items ?? []).map((item, index) => {
            const Icon = itemIcon(item);
            const isCurrent = effectiveKey === item.key;
            const isDone =
              item.kind === "doc" && completedIds.has(item.doc.id);
            const badge =
              item.kind === "assessment"
                ? item.phase === "pre"
                  ? "Pre-test"
                  : "Post-test"
                : item.kind === "live"
                  ? "Live"
                  : null;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => goTo(item.key)}
                aria-current={isCurrent ? "true" : undefined}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                  isCurrent
                    ? "bg-[#e3f2ea] font-semibold text-[#1a6b3c]"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[11px] font-semibold text-gray-400">
                  {isDone ? (
                    <CheckCircle2 size={16} className="text-green-500" />
                  ) : (
                    <Icon
                      size={15}
                      className={isCurrent ? "text-[#1a6b3c]" : "text-gray-400"}
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {itemTitle(item)}
                </span>
                {badge ? (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      item.kind === "live"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {badge}
                  </span>
                ) : (
                  <span className="shrink-0 text-[11px] font-medium text-gray-300">
                    {index + 1}
                  </span>
                )}
              </button>
            );
          })
        )}
      </nav>

      {/* Overall course progress */}
      <div className="border-t border-gray-100 p-4">
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-gray-400">
          <span>Course progress</span>
          <span className="font-bold text-[#1a6b3c]">{progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-[#1a6b3c] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4">
        <button
          type="button"
          aria-label="Toggle module outline"
          onClick={() => setSidebarOpen((current) => !current)}
          className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 lg:hidden"
        >
          <Menu size={20} />
        </button>

        <MonitorPlay
          size={20}
          className="hidden shrink-0 text-[#1a6b3c] sm:block"
        />
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

              {/* Module + item eyebrow */}
              {currentItem && currentSection ? (
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Module {currentSection.moduleIndex + 1}: {currentSection.title}
                </p>
              ) : null}

              {/* Reading material */}
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
                      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-12">
                        <ClipboardCheck
                          size={36}
                          className="mx-auto mb-4 text-[#1a6b3c]"
                        />
                        <h2 className="text-xl font-bold text-gray-800 sm:text-2xl">
                          {currentItem.doc.title}
                        </h2>
                        {linkedAssessment ? (
                          <>
                            <p className="mx-auto mt-3 max-w-md text-sm text-gray-500">
                              {linkedAssessment.questions.length} question(s) •
                              Pass mark {linkedAssessment.pass_mark}%. Your
                              camera will verify your identity before it starts.
                            </p>
                            <Link
                              href={`/staff/course/${courseId}/assessment/${
                                linkedAssessment.type === "PRE_TEST"
                                  ? "pre-test"
                                  : "post-test"
                              }?assessment=${linkedAssessment.id}`}
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

              {/* Assessment gate (pre/post-test) */}
              {currentItem?.kind === "assessment" && (
                <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-12">
                  {currentItem.phase === "post" && sectionProgress >= 100 && (
                    <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-1.5 text-xs font-bold text-green-700">
                      <Award size={14} /> Module activities completed — well
                      done!
                    </p>
                  )}
                  <ClipboardCheck
                    size={36}
                    className="mx-auto mb-4 text-[#1a6b3c]"
                  />
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#1a6b3c]">
                    {currentItem.phase === "pre"
                      ? "Before this module"
                      : "After this module"}
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-gray-800 sm:text-2xl">
                    {currentItem.assessment.title}
                  </h2>
                  <p className="mx-auto mt-3 max-w-md text-sm text-gray-500">
                    {currentItem.assessment.description ||
                      (currentItem.phase === "pre"
                        ? "A short check of what you already know. Your camera will verify your identity before it starts."
                        : "Pass this assessment to complete the module. Your camera will verify your identity before it starts.")}
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    {currentItem.assessment.questions.length} question(s) • Pass
                    mark {currentItem.assessment.pass_mark}%
                  </p>
                  <Link
                    href={`/staff/course/${courseId}/assessment/${
                      currentItem.phase === "pre" ? "pre-test" : "post-test"
                    }?assessment=${currentItem.assessment.id}`}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1a6b3c] px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#145530]"
                  >
                    <PlayCircle size={17} /> Take Assessment
                  </Link>
                </div>
              )}

              {/* Live session */}
              {currentItem?.kind === "live" &&
                (() => {
                  const session = currentItem.session;
                  const isClosed =
                    session.status === "COMPLETED" ||
                    session.status === "CANCELLED";

                  return (
                    <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-12">
                      <Video size={36} className="mx-auto mb-4 text-[#1a6b3c]" />
                      <h2 className="text-xl font-bold text-gray-800 sm:text-2xl">
                        {session.title}
                      </h2>
                      {session.description ? (
                        <p className="mx-auto mt-3 max-w-md text-sm text-gray-500">
                          {session.description}
                        </p>
                      ) : null}

                      <div className="mx-auto mt-5 flex max-w-sm flex-col gap-2 text-sm text-gray-600">
                        <span className="flex items-center justify-center gap-2">
                          <Calendar size={15} className="text-[#1a6b3c]" />
                          {formatDateTime(session.start_time)}
                        </span>
                        <span className="flex items-center justify-center gap-2">
                          <Clock size={15} className="text-[#1a6b3c]" />
                          Ends {formatDateTime(session.end_time)}
                        </span>
                      </div>

                      <div className="mt-6">
                        {isClosed ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-500">
                            {session.status}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleJoinSession(session)}
                            disabled={joiningSessionId === session.id}
                            className={`inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold text-white shadow-sm transition disabled:opacity-60 ${
                              session.status === "ONGOING"
                                ? "bg-red-500 hover:bg-red-600"
                                : "bg-[#1a6b3c] hover:bg-[#145530]"
                            }`}
                          >
                            <Video size={17} />
                            {joiningSessionId === session.id
                              ? "Joining..."
                              : session.status === "ONGOING"
                                ? "Join Live Now"
                                : "Join Session"}
                          </button>
                        )}
                        <p className="mt-3 text-xs text-gray-400">
                          Set your meeting name to your full name and file
                          number so your attendance is recorded.
                        </p>
                      </div>
                    </div>
                  );
                })()}

              {!currentItem && (
                <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
                  No learning materials have been added to this course yet.
                </div>
              )}
            </div>
          </div>

          {/* Prev / Next footer with module-boundary awareness */}
          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3 sm:px-8">
            <button
              type="button"
              onClick={goPrev}
              disabled={!prevItem}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-[#1a6b3c] hover:text-[#1a6b3c] disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-600"
            >
              <ChevronLeft size={16} />
              {prevCrossesModule ? "Previous Module" : "Previous"}
            </button>

            <span className="hidden text-xs font-medium text-gray-400 sm:block">
              {currentIndex >= 0
                ? `Item ${currentIndex + 1} of ${items.length}`
                : ""}
            </span>

            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a6b3c] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#145530]"
            >
              {!nextItem
                ? "Finish"
                : nextCrossesModule
                  ? "Next Module"
                  : "Next"}
              <ChevronRight size={16} />
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
