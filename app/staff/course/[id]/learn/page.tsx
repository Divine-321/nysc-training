"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Award,
  BookOpen,
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
  Lock,
  Menu,
  MessageSquareText,
  MonitorPlay,
  PlayCircle,
  Presentation,
  UserCheck,
  Video,
  X,
} from "lucide-react";
import RichTextViewer from "@/app/components/RichTextViewer";
import CourseEvaluationForm, {
  buildEvaluationSubmission,
  missingRequiredQuestions,
  type EvaluationAnswerState,
} from "@/app/components/CourseEvaluationForm";
import {
  documentIsComplete,
  attemptsForEnrollment,
  flagIsTrue,
  loadAssessmentAttempts,
  loadAssessments,
  loadEvaluationQuestions,
  loadLiveSessionsForCourse,
  loadStaffCourse,
  markDocumentComplete,
  toPercentage,
  type Assessment,
  type EvaluationQuestion,
  type LiveSession,
  type ModuleActivity,
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

type OverviewItem = {
  key: string;
  kind: "overview";
  moduleId: number;
  moduleIndex: number;
  title: string;
  description: string | null;
};

type DocItem = {
  key: string;
  kind: "doc";
  moduleId: number;
  moduleIndex: number;
  doc: ModuleActivity;
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

// The course-closing step. Only one exists, appended after the final module.
type EvalItem = {
  key: string;
  kind: "evaluation";
  moduleId: number;
  moduleIndex: number;
};

type PlayerItem = OverviewItem | DocItem | AssessmentItem | LiveItem | EvalItem;

type ModuleSection = {
  moduleId: number;
  moduleIndex: number;
  title: string;
  trainer: string | null;
  items: PlayerItem[];
};

const AUDIO_URL_PATTERN = /\.(mp3|wav|m4a|aac|ogg|oga|opus)(\?|#|$)/i;
// Office documents we can render inline via the Microsoft Office viewer.
const OFFICE_URL_PATTERN = /\.(pptx?|ppsx?|potx?|docx?|xlsx?)(\?|#|$)/i;

/**
 * How much of a video or audio file must be played before it can be marked
 * complete. Not the whole thing: closing credits, a trailing silence or a few
 * seconds lost to buffering should not leave someone unable to finish.
 */
const MEDIA_COMPLETE_FRACTION = 0.9;

/**
 * How long a material with no measurable progress — a PDF, a slide deck, a
 * written lesson, an image — must be open before it can be ticked off.
 *
 * Video and audio can be measured, so they are. Everything else offers the
 * player no signal at all: an embedded PDF's scroll position is inside a
 * cross-origin frame and simply cannot be read. Time open is the only thing
 * left to go on. It is a speed bump rather than proof — someone can open a
 * page and walk away — but it stops a whole module being ticked off in the
 * time it takes to click down the sidebar.
 *
 * Measured from timestamps rather than by counting ticks: browsers throttle
 * background timers to about one tick a minute, which would leave the
 * countdown visibly stuck for anyone who switched tabs and back.
 */
const MIN_SECONDS_ON_MATERIAL = 45;

function documentUrl(doc: ModuleActivity) {
  return doc.content_url ?? doc.file_url ?? "";
}

type DocumentKind =
  | "VIDEO"
  | "PDF"
  | "IMAGE"
  | "AUDIO"
  | "TEXT"
  | "OFFICE"
  | "ASSESSMENT"
  | "OTHER";

function documentKind(doc: ModuleActivity): DocumentKind {
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
      return "OFFICE";
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
      return "OFFICE";
    default: {
      const url = documentUrl(doc);
      if (doc.text_content && !url) return "TEXT";
      if (OFFICE_URL_PATTERN.test(url)) return "OFFICE";
      return AUDIO_URL_PATTERN.test(url) ? "AUDIO" : "OTHER";
    }
  }
}

/**
 * True for material whose completion is gated on time spent with it open.
 *
 * Excludes video and audio, which are gated on playback instead, and external
 * resources, which open in another tab — timing a page the learner is not
 * looking at would measure nothing.
 */
function isTimedMaterial(kind: DocumentKind) {
  return (
    kind === "PDF" ||
    kind === "TEXT" ||
    kind === "IMAGE" ||
    kind === "OFFICE"
  );
}

function documentIcon(doc: ModuleActivity) {
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
    case "OFFICE":
      return Presentation;
    default:
      return ExternalLink;
  }
}

function itemIcon(item: PlayerItem) {
  if (item.kind === "overview") return BookOpen;
  if (item.kind === "assessment") return ClipboardCheck;
  if (item.kind === "live") return Video;
  if (item.kind === "evaluation") return MessageSquareText;
  return documentIcon(item.doc);
}

function itemTitle(item: PlayerItem) {
  if (item.kind === "overview") return "Overview";
  if (item.kind === "assessment") {
    return item.phase === "pre" ? "Pre-Assessment" : "Post-Assessment";
  }
  if (item.kind === "live") return item.session.title || "Live Session";
  if (item.kind === "evaluation") return "Course Evaluation";
  return item.doc.title;
}

/**
 * Why the programme is not at 100% yet, in terms a learner can act on.
 *
 * The player itself now locks the evaluation on this same rule (see
 * totalSteps/doneSteps), so reaching this normally means a rare edge case —
 * session state changing between page load and submit. Kept as a fallback:
 * the backend refuses an evaluation until 100% and says only that, and a
 * learner reading it has usually finished every module with no idea a live
 * session is what's still missing.
 */
function describeMissingCompletion(sessions: LiveSession[]) {
  const unattended = sessions.filter(
    (session) =>
      !flagIsTrue(session.has_joined) && session.status !== "CANCELLED",
  );

  if (unattended.length === 0) {
    return "This course is not quite complete yet. Work back through the modules — an activity or a post-assessment is still outstanding.";
  }

  const names = unattended
    .map((session) => session.title?.trim() || "a live session")
    .join(", ");

  // Where to go matters as much as what is missing. A module-linked session
  // is right here, in this player's timeline; a session covering the whole
  // training only appears on the course overview page.
  const where = unattended.some((session) => session.module == null)
    ? " You will find it on the course page, under “Live sessions for this training”."
    : "";

  return unattended.length === 1
    ? `You still need to join the live session “${names}” — attending it counts towards completing this course.${where}`
    : `You still need to join these live sessions: ${names}. Attending them counts towards completing this course.${where}`;
}

function DocumentContent({
  doc,
  onPlayedFraction,
  onFinished,
}: {
  doc: ModuleActivity;
  /** How much of a video or audio file has been played, 0-1. */
  onPlayedFraction?: (fraction: number) => void;
  /** Playback reached the end of a video or audio file. */
  onFinished?: () => void;
}) {
  // Fires several times a second while playing, so only the rounded value is
  // reported — React discards an update that does not change the state.
  const handleTimeUpdate = (
    event: React.SyntheticEvent<HTMLMediaElement>,
  ) => {
    const media = event.currentTarget;
    if (!media.duration || !Number.isFinite(media.duration)) return;
    onPlayedFraction?.(
      Math.round((media.currentTime / media.duration) * 100) / 100,
    );
  };

  // Completion hangs off "ended" rather than the fraction reaching 1: time
  // updates stop firing a little short of the duration often enough that
  // watching the number would miss real finishes.
  const handleEnded = () => {
    onPlayedFraction?.(1);
    onFinished?.();
  };

  const kind = documentKind(doc);
  const url = documentUrl(doc);

  if (kind === "TEXT") {
    return doc.text_content ? (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mx-auto max-w-3xl">
          <RichTextViewer html={doc.text_content} />
        </div>
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
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
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
        <audio
          controls
          src={url}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          className="w-full"
        >
          Your browser does not support this audio file.
        </audio>
      </div>
    );
  }

  if (kind === "OFFICE") {
    // Render PowerPoint/Word/Excel inline via the Microsoft Office viewer so
    // the learner stays inside the module. The file must be publicly reachable
    // (Cloudinary URLs are). A fallback link covers the rare viewer failure.
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
      url,
    )}`;

    return (
      <div className="space-y-3">
        <iframe
          src={viewerUrl}
          title={doc.title}
          className="h-[70vh] w-full rounded-xl border border-gray-200 bg-white shadow-sm"
          allowFullScreen
        />
        <p className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
          <span>Slides not loading?</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-[#1a6b3c] hover:underline"
          >
            <ExternalLink size={13} /> Open in a new tab
          </a>
        </p>
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
  const [passedAssessmentIds, setPassedAssessmentIds] = useState<Set<number>>(
    new Set(),
  );
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  // Whole-training sessions (session.module is null) — joined from the
  // course overview page, not from inside a module, but still shown as an
  // explanatory row here so a fully-checked module list doesn't leave the
  // evaluation locked with nothing on screen saying why.
  const generalSessions = useMemo(
    () => liveSessions.filter((session) => session.module == null),
    [liveSessions],
  );
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  // Playback of the item on screen, 0-1. Reset on navigation: it
  // describes what is currently open, not a per-item record.
  const [playedFraction, setPlayedFraction] = useState(0);
  // Seconds the current material has been open, tagged with the item it was
  // counted for. Tagging is what resets it: a reading elsewhere in the course
  // simply does not match, so it reads as zero without an effect having to
  // clear it on every navigation.
  const [dwell, setDwell] = useState({ key: "", seconds: 0 });
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [moduleSwitcherOpen, setModuleSwitcherOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [joiningSessionId, setJoiningSessionId] = useState<number | null>(null);
  const [evalQuestions, setEvalQuestions] = useState<EvaluationQuestion[]>([]);
  const [evalQuestionsLoading, setEvalQuestionsLoading] = useState(false);
  const [evalAnswers, setEvalAnswers] = useState<EvaluationAnswerState>({});
  const [evalSubmitting, setEvalSubmitting] = useState(false);
  const [evalDone, setEvalDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // Wall-clock reference for "has this live session already ended?" — captured
  // once per mount (render must stay pure, so no Date.now() inline).
  const [pageLoadedAt] = useState(() => Date.now());
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Build the per-module sections in the fixed learning order.
  const sections = useMemo<ModuleSection[]>(() => {
    if (!staffCourse) return [];

    const orderedModules = staffCourse.modules
      .slice()
      .sort((first, second) => first.order - second.order);

    const built: ModuleSection[] = orderedModules.map((module, moduleIndex) => {
      const items: PlayerItem[] = [];

      // 0. Module overview (introduction + description) — always first.
      items.push({
        key: `overview-${module.id}`,
        kind: "overview",
        moduleId: module.id,
        moduleIndex,
        title: module.title,
        description: module.description,
      });

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
      for (const doc of module.activities
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

    // General live sessions (session.module is null — the admin's "whole
    // training" option) are NOT added here. They have their own home on the
    // course overview page (CourseLiveSessions, rendered as its own grid
    // card), with its own join flow already — putting them here too would
    // just be a second, competing way to join the same session. This player
    // still gates the evaluation on them being attended (see totalSteps
    // below); it just doesn't render them as a step.

    // Course-closing evaluation — the final step after the last module.
    if (built.length > 0) {
      const last = built[built.length - 1];
      last.items.push({
        key: "evaluation",
        kind: "evaluation",
        moduleId: last.moduleId,
        moduleIndex: last.moduleIndex,
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

  // Gating facts about whatever is on screen, needed both by the dwell timer
  // below and by the complete button far down in the markup.
  const currentDocKind =
    currentItem?.kind === "doc" ? documentKind(currentItem.doc) : null;
  const currentDocDone =
    currentItem?.kind === "doc" && completedIds.has(currentItem.doc.id);
  const timingThisItem =
    currentDocKind !== null && isTimedMaterial(currentDocKind) && !currentDocDone;

  const secondsOnItem = dwell.key === effectiveKey ? dwell.seconds : 0;
  const secondsLeftOnItem = Math.max(
    0,
    MIN_SECONDS_ON_MATERIAL - secondsOnItem,
  );

  // Only ticks while something is actually waiting on it — the player is a
  // heavy page and a permanent one-second re-render would cost far more than
  // the feature is worth.
  useEffect(() => {
    if (!timingThisItem || !effectiveKey) return;

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setDwell({
        key: effectiveKey,
        seconds: Math.round((Date.now() - startedAt) / 1000),
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [timingThisItem, effectiveKey]);

  const allDocs = useMemo(
    () => items.filter((item): item is DocItem => item.kind === "doc"),
    [items],
  );
  const totalDocs = allDocs.length;
  const completedDocs = allDocs.filter((item) =>
    completedIds.has(item.doc.id),
  ).length;
  const localProgress =
    totalDocs === 0 ? 0 : Math.round((completedDocs / totalDocs) * 100);

  // Post-assessment gate per module: a module only counts as "done" once its
  // POST_TEST (if any) is passed. Mirrors the Modules page so the two agree.
  const postAssessmentByModule = useMemo(() => {
    const map = new Map<number, number>();
    for (const assessment of assessments) {
      if (assessment.type === "POST_TEST" && assessment.module != null) {
        map.set(assessment.module, assessment.id);
      }
    }
    return map;
  }, [assessments]);

  const modulePostSatisfied = (moduleId: number) => {
    const postId = postAssessmentByModule.get(moduleId);
    return postId === undefined || passedAssessmentIds.has(postId);
  };

  // Course progress is step-based — every content item, each module's
  // post-assessment, AND every live session (module-linked or general) —
  // so the player agrees with the Modules page and only reaches 100% once
  // everything is truly complete, evaluation included. Live sessions used
  // to be left out here even though the backend counts them: this player
  // would show 100% and unlock the evaluation while an unattended session
  // still sat right there in the timeline, only to have the submission
  // refused server-side with describeMissingCompletion's explanation below.
  // (The dashboard/training cards still show the backend content-only %
  // until B1/B3 land server-side.) Falls back to the backend value
  // pre-hydration.
  const { totalSteps, doneSteps } = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const section of sections) {
      const secDocs = section.items.filter(
        (item): item is DocItem => item.kind === "doc",
      );
      total += secDocs.length;
      done += secDocs.filter((item) => completedIds.has(item.doc.id)).length;
      const postId = postAssessmentByModule.get(section.moduleId);
      if (postId !== undefined) {
        total += 1;
        if (passedAssessmentIds.has(postId)) done += 1;
      }
    }

    // Live sessions — module-linked (shown as a step in this player) and
    // general (shown on the course overview page instead) — counted here
    // directly from liveSessions rather than from `sections`, since a
    // general session never appears inside any module's own item list. A
    // cancelled session was never something to attend, so it doesn't block
    // completion — same exemption describeMissingCompletion uses.
    const countableSessions = liveSessions.filter(
      (session) => session.status !== "CANCELLED",
    );
    total += countableSessions.length;
    done += countableSessions.filter((session) => flagIsTrue(session.has_joined))
      .length;

    return { totalSteps: total, doneSteps: done };
  }, [
    sections,
    completedIds,
    postAssessmentByModule,
    passedAssessmentIds,
    liveSessions,
  ]);

  const progress =
    totalSteps > 0
      ? Math.round((doneSteps / totalSteps) * 100)
      : staffCourse?.enrollment.completion_percentage != null
        ? toPercentage(staffCourse.enrollment.completion_percentage)
        : localProgress;

  // The course evaluation is the final, mandatory step and stays locked until
  // every other module — including its post-assessment — is complete. Once
  // submitted it is never re-locked, so a learner can always revisit feedback.
  const evalUnlocked =
    totalSteps > 0 ? doneSteps >= totalSteps : progress >= 100;
  const evalLocked = !evalDone && !evalUnlocked;

  // Q14 ("was the live session valuable") is hidden by the backend itself for
  // a programme with no live session, as long as the question-bank request
  // passed ?enrollment= — nothing to filter client-side any more.
  const evalMissingRequired = useMemo(
    () => missingRequiredQuestions(evalQuestions, evalAnswers),
    [evalQuestions, evalAnswers],
  );

  const sectionDocs = (currentSection?.items ?? []).filter(
    (item): item is DocItem => item.kind === "doc",
  );
  const sectionCompleted = sectionDocs.filter((item) =>
    completedIds.has(item.doc.id),
  ).length;
  // Activities only — kept separate from the broader count below because
  // it drives the "Module activities completed" banner right before the
  // post-assessment gate, which must stay true there regardless of whether
  // the post-assessment itself (or a live session) is done yet.
  const sectionProgress =
    sectionDocs.length === 0
      ? 0
      : Math.round((sectionCompleted / sectionDocs.length) * 100);

  // Everything this module actually requires — activities, its
  // post-assessment (if it has one), and any live session tied to it — all
  // already loaded in currentSection.items, so this costs nothing extra to
  // compute. Used for the module header's X/Y badge and progress bar, so
  // that number agrees with the course-wide step count and the evaluation
  // lock instead of only counting activities and calling a module "5/5"
  // while a live session or post-assessment it still needs sits outstanding.
  const sectionLiveItems = (currentSection?.items ?? []).filter(
    (item): item is LiveItem =>
      item.kind === "live" && item.session.status !== "CANCELLED",
  );
  const sectionPostId = currentSection
    ? postAssessmentByModule.get(currentSection.moduleId)
    : undefined;
  const sectionOverallTotal =
    sectionDocs.length +
    sectionLiveItems.length +
    (sectionPostId !== undefined ? 1 : 0);
  const sectionOverallCompleted =
    sectionCompleted +
    sectionLiveItems.filter((item) => flagIsTrue(item.session.has_joined))
      .length +
    (sectionPostId !== undefined && passedAssessmentIds.has(sectionPostId)
      ? 1
      : 0);
  const sectionOverallProgress =
    sectionOverallTotal === 0
      ? 0
      : Math.round((sectionOverallCompleted / sectionOverallTotal) * 100);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseData, assessmentData, attemptData] = await Promise.all([
          loadStaffCourse(courseId),
          loadAssessments(courseId).catch(() => []),
          loadAssessmentAttempts().catch(() => []),
        ]);

        if (!courseData) {
          setError("This course is not assigned to you.");
          return;
        }

        setStaffCourse(courseData);
        setAssessments(assessmentData);
        // Scoped to this enrollment: passes from a previous delivery of the
        // same course must not tick off a refresher run's assessments.
        setPassedAssessmentIds(
          new Set(
            attemptsForEnrollment(attemptData, courseData.enrollment)
              .filter((attempt) => attempt.passed)
              .map((attempt) => attempt.assessment),
          ),
        );

        // Whether the evaluation is already done comes from this flag, not
        // from the nested `evaluation` object being non-null — the backend's
        // integration notes are explicit that the thin {id, submitted_at}
        // shape isn't the right thing to check truthiness on.
        const alreadyEvaluated = flagIsTrue(courseData.enrollment.evaluation_submitted);
        setEvalDone(alreadyEvaluated);

        // The question bank needs the enrollment id (it's how the backend
        // knows whether to include Q14, the live-session question), so this
        // can only start once loadStaffCourse above has resolved. Not
        // awaited: the evaluation is the last step of the course, so there's
        // no rush, and the step itself shows a loading state until this
        // lands.
        if (!alreadyEvaluated) {
          setEvalQuestionsLoading(true);
          loadEvaluationQuestions(courseData.enrollment.id)
            .then(setEvalQuestions)
            .catch((questionsError) => {
              setNotice(
                questionsError instanceof Error
                  ? questionsError.message
                  : "Could not load the evaluation questions.",
              );
            })
            .finally(() => setEvalQuestionsLoading(false));
        }

        // `?step=` lets the standalone /live and /evaluation routes deep-link
        // straight into the matching timeline step so notifications never feel
        // like they leave the module flow.
        const requestedStep = searchParams.get("step");

        // Live sessions belong to this enrollment's programme delivery.
        void loadLiveSessionsForCourse([courseData.enrollment.cohort_course])
          .then((sessions) => {
            setLiveSessions(sessions);
            if (requestedStep === "live" && sessions.length > 0) {
              // Only if the learner hasn't already navigated elsewhere.
              setCurrentKey((current) => current ?? `live-${sessions[0].id}`);
            }
          })
          .catch(() => setLiveSessions([]));

        const done = new Set<number>();
        for (const courseModule of courseData.modules) {
          for (const doc of courseModule.activities) {
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
            module.activities
              .slice()
              .sort((first, second) => first.order - second.order),
          );

        const requestedModule = courseData.modules.find(
          (module) => module.id === requestedModuleId,
        );

        if (requestedStep === "evaluation") {
          // The evaluation is the single course-closing step.
          setCurrentKey("evaluation");
        } else if (requestedStep === "live") {
          // Landing is applied once live sessions resolve (see .then above).
        } else if (requestedModule) {
          // A fresh module opens on its overview (introduction); a module
          // already in progress resumes at its first incomplete material.
          const moduleDocs = requestedModule.activities
            .slice()
            .sort((first, second) => first.order - second.order);
          const hasProgress = moduleDocs.some((doc) => done.has(doc.id));
          const nextDoc = moduleDocs.find((doc) => !done.has(doc.id));

          if (hasProgress && nextDoc) {
            setCurrentKey(`doc-${nextDoc.id}`);
          } else {
            setCurrentKey(`overview-${requestedModule.id}`);
          }
        } else {
          const requested = orderedDocs.find(
            (doc) => doc.id === requestedDocId,
          );
          const firstIncomplete = orderedDocs.find((doc) => !done.has(doc.id));
          const landing = requested ?? firstIncomplete;

          if (landing) {
            setCurrentKey(`doc-${landing.id}`);
          } else if (!alreadyEvaluated) {
            // Everything is read, so there is no "next incomplete" to resume
            // at. Falling back to the first material here is what sent people
            // back to the start of module one after an assessment, since
            // finishing the content is exactly when that happens. The
            // evaluation is what is actually left.
            setCurrentKey("evaluation");
          } else if (orderedDocs.length > 0) {
            // Course fully finished: stay at the end rather than the start.
            setCurrentKey(`doc-${orderedDocs[orderedDocs.length - 1].id}`);
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
    // The new item has not been played at all yet.
    setPlayedFraction(0);
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

  const markComplete = async (doc: ModuleActivity) => {
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
    // Next moves on and nothing more. It used to mark the current material
    // complete, so clicking through a course to see what was in it drove
    // progress to 100% without anything being read or watched — and that
    // progress is what the certificate requirements are built on. Completing
    // is now a deliberate act, via the button beside this one.

    // The course-closing evaluation is mandatory: the learner cannot finish the
    // course (and reach their certificate) until it has been submitted — and it
    // only unlocks once every other module is complete.
    if (currentItem?.kind === "evaluation" && !evalDone) {
      setNotice(
        evalLocked
          ? "Complete all modules to unlock the course evaluation."
          : "Please complete the course evaluation below before finishing the course.",
      );
      contentRef.current?.scrollTo({
        top: contentRef.current.scrollHeight,
        behavior: "smooth",
      });
      return;
    }

    if (currentIndex >= 0 && currentIndex < items.length - 1) {
      goTo(items[currentIndex + 1].key);
    } else {
      // Finished the final step — celebrate and take them to their
      // certificate (the certificates page shows eligibility/requirements).
      router.push(`/staff/certifications`);
    }
  };

  const handleEvalSubmit = async () => {
    if (!staffCourse || evalDone) return;

    if (evalMissingRequired.length > 0) {
      setNotice(
        `Please answer every required question (${evalMissingRequired.length} left) before submitting.`,
      );
      return;
    }

    setEvalSubmitting(true);
    setNotice("");

    try {
      const response = await fetch("/api/training/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollment: staffCourse.enrollment.id,
          evaluations: buildEvaluationSubmission(evalQuestions, evalAnswers),
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const raw = extractErrorMessage(
          payload,
          "Could not submit your evaluation.",
        );

        // "Already submitted" is a real, expected 400 (e.g. a second tab, or
        // a retry after a slow response actually landed) — the form is done,
        // not broken, so treat it the same as a successful submit rather than
        // showing an error.
        if (/already submitted/i.test(raw)) {
          setEvalDone(true);
          router.push("/staff/certifications");
          return;
        }

        // The backend refuses an evaluation until the programme is at 100%,
        // and says only that. A learner reading it has usually finished every
        // module and has no idea what is missing — most often a live session,
        // which counts towards completion but sits outside the module list,
        // so nothing on screen shows it as outstanding.
        throw new Error(
          /100%|100 %|completed before/i.test(raw)
            ? describeMissingCompletion(liveSessions)
            : raw,
        );
      }

      setEvalDone(true);

      // The evaluation is the final requirement — it only unlocks once every
      // other module (post-assessment included) is complete. So the moment it
      // is submitted the course is 100% done and the backend issues the
      // certificate. Take the learner straight to it instead of making them
      // click "Finish Course" afterwards.
      router.push("/staff/certifications");
    } catch (submitError) {
      setNotice(
        submitError instanceof Error
          ? submitError.message
          : "Could not submit your evaluation.",
      );
    } finally {
      setEvalSubmitting(false);
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
  // "Finish Course" is only reachable once the mandatory evaluation is in.
  const finishBlocked = currentItem?.kind === "evaluation" && !evalDone;

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
                    sectionOverallProgress >= 100
                      ? "bg-green-500"
                      : "bg-[#1a6b3c]"
                  }`}
                  style={{ width: `${sectionOverallProgress}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-gray-500">
                {sectionOverallCompleted}/{sectionOverallTotal}
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
                  // Content finished AND the module's post-assessment passed.
                  const done =
                    secDocs.length > 0 &&
                    secDone === secDocs.length &&
                    modulePostSatisfied(section.moduleId);
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
          (currentSection?.items ?? []).flatMap((item, index) => {
            const Icon = itemIcon(item);
            const isCurrent = effectiveKey === item.key;
            const isDone =
              (item.kind === "doc" && completedIds.has(item.doc.id)) ||
              (item.kind === "evaluation" && evalDone);
            const itemLocked = item.kind === "evaluation" && evalLocked;
            // Assessment items already read "Pre-/Post-Assessment" in their
            // title, so only live sessions and the evaluation carry a badge.
            const badge =
              item.kind === "live"
                ? "Live"
                : item.kind === "evaluation"
                  ? "Final"
                  : null;

            const row = (
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
                  ) : itemLocked ? (
                    <Lock size={14} className="text-gray-400" />
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
                        : item.kind === "evaluation"
                          ? "bg-[#e3f2ea] text-[#1a6b3c]"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {badge}
                  </span>
                ) : item.kind === "doc" ? (
                  <span className="shrink-0 text-[11px] font-medium text-gray-300">
                    {index + 1}
                  </span>
                ) : null}
              </button>
            );

            // Right before the evaluation item (so only in the section that
            // has one), an explanatory row for general (whole-training) live
            // sessions — they gate the evaluation same as anything else here,
            // but the actual join button lives on the course overview page,
            // not inside a module. Without this, everything visible in this
            // list can show done while the evaluation stays locked, with
            // nothing on screen saying why. This isn't a real player step —
            // it navigates away rather than opening inline — so it's a plain
            // link, not part of `sections`/`items`, and touches nothing else
            // about how steps or progress are counted.
            if (item.kind !== "evaluation" || generalSessions.length === 0) {
              return [row];
            }

            const generalDone = generalSessions.every(
              (session) =>
                flagIsTrue(session.has_joined) ||
                session.status === "CANCELLED",
            );

            return [
              <Link
                key="general-live-session"
                href={`/staff/course/${courseId}`}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-gray-600 transition hover:bg-gray-50"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[11px] font-semibold text-gray-400">
                  {generalDone ? (
                    <CheckCircle2 size={16} className="text-green-500" />
                  ) : (
                    <Video size={15} className="text-gray-400" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  Course-wide Live Session
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    generalDone
                      ? "bg-green-50 text-green-700"
                      : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {generalDone ? "Done" : "On overview"}
                </span>
              </Link>,
              row,
            ];
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
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
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

              {/* Module overview / introduction */}
              {currentItem?.kind === "overview" && currentSection && (
                <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#e3f2ea] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#1a6b3c]">
                    <BookOpen size={14} /> Module {currentSection.moduleIndex + 1} of{" "}
                    {sections.length}
                  </span>
                  <h2 className="mt-3 text-2xl font-bold text-gray-800 sm:text-3xl">
                    {currentItem.title}
                  </h2>
                  {currentItem.description ? (
                    <p className="mt-3 text-sm leading-relaxed text-gray-600">
                      {currentItem.description}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-gray-400">
                      No description has been added for this module.
                    </p>
                  )}
                  {currentSection.trainer ? (
                    <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-sm font-medium text-[#1a6b3c]">
                      <UserCheck size={15} /> {currentSection.trainer}
                    </p>
                  ) : null}

                  {currentSection.items.some(
                    (entry) =>
                      entry.kind !== "overview" && entry.kind !== "evaluation",
                  ) ? (
                    <div className="mt-6 border-t border-gray-100 pt-6">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        What this module includes
                      </p>
                      <ul className="space-y-2.5">
                        {currentSection.items
                          .filter(
                            (entry) =>
                              entry.kind !== "overview" &&
                              entry.kind !== "evaluation",
                          )
                          .map((entry) => {
                            const LineIcon = itemIcon(entry);
                            return (
                              <li
                                key={entry.key}
                                className="flex items-center gap-2.5 text-sm text-gray-600"
                              >
                                <LineIcon
                                  size={16}
                                  className="shrink-0 text-[#1a6b3c]"
                                />
                                {itemTitle(entry)}
                              </li>
                            );
                          })}
                      </ul>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={goNext}
                    className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#1a6b3c] px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#145530]"
                  >
                    Begin Module <ChevronRight size={17} />
                  </button>
                </div>
              )}

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
                      {(() => {
                        const isDone = completedIds.has(currentItem.doc.id);
                        const kind = documentKind(currentItem.doc);
                        const isMedia = kind === "VIDEO" || kind === "AUDIO";
                        const isTimed = isTimedMaterial(kind);

                        // Video and audio are measured by playback; anything
                        // that cannot be measured is gated on time open
                        // instead. Neither blocks moving on — only marking it
                        // done.
                        const ready = isMedia
                          ? playedFraction >= MEDIA_COMPLETE_FRACTION
                          : !isTimed || secondsLeftOnItem === 0;

                        return (
                          <button
                            type="button"
                            onClick={() => void markComplete(currentItem.doc)}
                            disabled={isDone || !ready}
                            title={
                              ready
                                ? undefined
                                : isMedia
                                  ? `Play at least ${Math.round(MEDIA_COMPLETE_FRACTION * 100)}% of this ${kind === "AUDIO" ? "recording" : "video"} to mark it complete.`
                                  : `Spend at least ${MIN_SECONDS_ON_MATERIAL} seconds with this material to mark it complete.`
                            }
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                              isDone
                                ? "bg-green-100 text-green-700"
                                : ready
                                  ? "border border-[#1a6b3c] text-[#1a6b3c] hover:bg-green-50"
                                  : "cursor-not-allowed border border-gray-200 text-gray-400"
                            }`}
                          >
                            <CheckCircle2 size={14} />
                            {isDone
                              ? "Completed"
                              : ready
                                ? "Mark as complete"
                                : isMedia
                                  ? `Watched ${Math.round(playedFraction * 100)}%`
                                  : `Available in ${secondsLeftOnItem}s`}
                          </button>
                        );
                      })()}
                    </div>

                    <DocumentContent
                      doc={currentItem.doc}
                      onPlayedFraction={setPlayedFraction}
                      // Playing a recording to the end is the clearest
                      // statement there is that it was worked through, so it
                      // ticks itself off rather than asking for a click that
                      // could only say the same thing again.
                      onFinished={() => void markComplete(currentItem.doc)}
                    />
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
                        ? "A short check of what you already know."
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
                  // Treat a past end_time as closed too: the backend often
                  // leaves status at SCHEDULED/ONGOING after a session ends, and
                  // joining an ended session just hits a dead end.
                  const hasEnded =
                    !!session.end_time &&
                    new Date(session.end_time).getTime() < pageLoadedAt;
                  const isClosed =
                    session.status === "COMPLETED" ||
                    session.status === "CANCELLED" ||
                    hasEnded;
                  const closedLabel =
                    session.status === "CANCELLED"
                      ? "This session was cancelled"
                      : "This session has ended";

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
                            {closedLabel}
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
                        {!isClosed && (
                          <p className="mt-3 text-xs text-gray-400">
                            Set your meeting name to your full name and file
                            number so your attendance is recorded.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}

              {/* Course-closing evaluation */}
              {currentItem?.kind === "evaluation" && (
                <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                        evalLocked
                          ? "bg-amber-50 text-amber-600"
                          : "bg-[#e3f2ea] text-[#1a6b3c]"
                      }`}
                    >
                      {evalLocked ? (
                        <Lock size={22} />
                      ) : (
                        <MessageSquareText size={22} />
                      )}
                    </span>
                    <h2 className="text-2xl font-bold text-gray-800">
                      Course Evaluation
                    </h2>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    {evalLocked
                      ? "This is the final step of the course. It unlocks once you have completed every other module."
                      : "This is the final step of the course. You must submit this evaluation to finish and unlock your certificate."}
                  </p>

                  {evalLocked ? (
                    <div className="mx-auto mt-6 max-w-md rounded-xl border border-amber-100 bg-amber-50 p-5 text-center">
                      <Lock size={22} className="mx-auto mb-2 text-amber-600" />
                      <p className="font-semibold text-amber-800">
                        Complete all modules to unlock
                      </p>
                      <p className="mt-1 text-sm text-amber-700">
                        Finish every module in this course, then return here to
                        submit your evaluation and get your certificate.
                      </p>
                      <div className="mx-auto mt-4 max-w-xs">
                        <div className="mb-1 flex items-center justify-between text-xs font-medium text-amber-700">
                          <span>Course progress</span>
                          <span className="font-bold">{progress}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-amber-100">
                          <div
                            className="h-full rounded-full bg-amber-500 transition-all duration-500"
                            style={{ width: `${Math.max(progress, 2)}%` }}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/staff/course/${courseId}`)
                        }
                        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-6 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-50"
                      >
                        <ChevronLeft size={16} /> Back to Modules
                      </button>
                    </div>
                  ) : evalDone ? (
                    <div className="mx-auto mt-6 max-w-md space-y-4">
                      <div className="rounded-xl border border-green-100 bg-[#f0f7f3] p-5 text-center">
                        <CheckCircle2
                          size={24}
                          className="mx-auto mb-2 text-[#1a6b3c]"
                        />
                        <p className="font-semibold text-[#1a6b3c]">
                          Thank you — your feedback has been submitted.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={goNext}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a6b3c] py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#145530]"
                      >
                        <Award size={17} /> Finish Course &amp; View Certificate
                      </button>
                    </div>
                  ) : (
                    <div className="mt-8 space-y-8 border-t border-gray-100 pt-8">
                      {evalQuestionsLoading || evalQuestions.length === 0 ? (
                        <div className="flex items-center gap-2 py-10 text-sm text-gray-400">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-[#1a6b3c]" />
                          Loading the evaluation…
                        </div>
                      ) : (
                        <>
                          <CourseEvaluationForm
                            questions={evalQuestions}
                            answers={evalAnswers}
                            onChange={setEvalAnswers}
                            disabled={evalSubmitting}
                          />

                          <button
                            type="button"
                            onClick={() => void handleEvalSubmit()}
                            disabled={evalSubmitting || evalMissingRequired.length > 0}
                            className="w-full rounded-xl bg-[#1a6b3c] py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#145530] disabled:opacity-60"
                          >
                            {evalSubmitting
                              ? "Submitting..."
                              : evalMissingRequired.length > 0
                                ? `Answer ${evalMissingRequired.length} more question${
                                    evalMissingRequired.length === 1 ? "" : "s"
                                  }`
                                : "Submit Evaluation"}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {!evalLocked && !evalDone ? (
                    <p className="mt-4 text-xs text-gray-400">
                      Submit your evaluation, then click{" "}
                      <span className="font-semibold text-gray-500">
                        Finish Course
                      </span>{" "}
                      to view your certificate.
                    </p>
                  ) : null}
                </div>
              )}

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
              disabled={finishBlocked}
              title={
                finishBlocked
                  ? "Submit the course evaluation to finish"
                  : undefined
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a6b3c] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#145530] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#1a6b3c]"
            >
              {!nextItem
                ? "Finish Course"
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
