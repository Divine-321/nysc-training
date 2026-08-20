"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  HeartPulse,
  Landmark,
  Layers,
  LayoutGrid,
  List,
  Lock,
  MessageSquare,
  PlayCircle,
  RotateCcw,
  Rocket,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { Skeleton } from "@/app/components/ui";
import {
  documentIsComplete,
  attemptsForEnrollment,
  loadAssessmentAttempts,
  loadAssessments,
  loadModulesBreakdown,
  loadStaffCourse,
  programmeWindow,
  toPercentage,
  type CourseModule,
  type CourseEnrollment,
  type ModuleBreakdown,
  type StaffCourse,
} from "@/app/lib/staff-learning";

// --- Branded module banners (deterministic per module title) -----------------
type BannerIcon = ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;

const BANNER_THEMES = [
  { gradient: "from-emerald-500 via-emerald-600 to-teal-700", glow: "bg-teal-300/40" },
  { gradient: "from-teal-500 via-cyan-600 to-sky-700", glow: "bg-cyan-300/40" },
  { gradient: "from-sky-500 via-blue-600 to-indigo-700", glow: "bg-sky-300/40" },
  { gradient: "from-indigo-500 via-violet-600 to-purple-700", glow: "bg-violet-300/40" },
  { gradient: "from-fuchsia-500 via-purple-600 to-indigo-700", glow: "bg-fuchsia-300/40" },
  { gradient: "from-rose-500 via-pink-600 to-fuchsia-700", glow: "bg-rose-300/40" },
  { gradient: "from-amber-500 via-orange-600 to-rose-600", glow: "bg-amber-300/40" },
  { gradient: "from-lime-500 via-emerald-600 to-teal-700", glow: "bg-lime-300/40" },
] as const;

const ICON_RULES: Array<[RegExp, BannerIcon]> = [
  [/induct|orient|onboard|welcome|prep|foundation/i, Rocket],
  [/safe|security|protect|risk|emergen|welfare|grievance/i, ShieldCheck],
  [/lead|manage|supervis|team|hr\b|human resource|role|responsib/i, Users],
  [/health|medical|first aid|wellness|hygien/i, HeartPulse],
  [/finance|budget|account|payroll|procure|office/i, Landmark],
  [/tech|digital|computer|\bit\b|software|data|cyber/i, Cpu],
  [/comm|writ|report|present|speak|media/i, MessageSquare],
  [/law|legal|policy|ethic|govern|complian|conduct|function/i, Scale],
  [/skill|develop|growth|capacity|profession|service|delivery/i, Sparkles],
];

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function bannerFor(title: string) {
  const theme = BANNER_THEMES[hashString(title) % BANNER_THEMES.length];
  const rule = ICON_RULES.find(([pattern]) => pattern.test(title));
  const Icon = rule ? rule[1] : Layers;
  return { ...theme, Icon };
}

const DOT_TEXTURE = {
  backgroundImage:
    "radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)",
  backgroundSize: "16px 16px",
} as const;

// --- Per-module progress -----------------------------------------------------
type ModuleStat = {
  total: number;
  completed: number;
  percent: number;
  status: "completed" | "inprogress" | "notstarted";
  /** True when every content item is done but the post-assessment isn't. */
  awaitingPost: boolean;
  /**
   * False when the backend's breakdown for this module has not arrived.
   *
   * The figures are then meaningless and must not be shown. Counting
   * activities locally instead used to fill the gap, but that count cannot
   * see live sessions, so it produced a plausible number that quietly
   * disagreed with the course total — worse than an empty space, because
   * nobody reports a number that merely looks wrong.
   */
  known: boolean;
};

/** A module's post-assessment gate (the pre-assessment never gates progress). */
type PostGate = { required: boolean; passed: boolean };

function statFor(
  module: CourseModule,
  enrollment: CourseEnrollment,
  post: PostGate,
  backend?: ModuleBreakdown,
): ModuleStat {
  const docsTotal = module.documents.length;
  const docsDone = module.documents.filter((doc) =>
    documentIsComplete(enrollment, doc.id),
  ).length;

  // Every figure here is the backend's. Without its breakdown there is
  // nothing to show, which `known` says explicitly.
  const total = backend?.total_steps ?? 0;
  const completed = backend?.completed_steps ?? 0;
  const percent = backend ? Math.round(backend.completion_percentage) : 0;
  const status =
    total > 0 && completed >= total
      ? "completed"
      : completed > 0
        ? "inprogress"
        : "notstarted";
  const awaitingPost = post.required && !post.passed && docsDone === docsTotal;

  return { total, completed, percent, status, awaitingPost, known: backend != null };
}

const STATUS_LABEL: Record<ModuleStat["status"], string> = {
  completed: "Completed",
  inprogress: "In progress",
  notstarted: "Not started",
};

const STATUS_DOT: Record<ModuleStat["status"], string> = {
  completed: "bg-emerald-500",
  inprogress: "bg-blue-500 animate-pulse",
  notstarted: "bg-amber-500",
};

export default function CourseModulesPage() {
  const params = useParams();
  const courseId = Number(params.id);

  const [staffCourse, setStaffCourse] = useState<StaffCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "inprogress" | "completed">("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  // Each module's POST_TEST assessment id, and the ids the staff has passed —
  // used to gate module completion on the post-assessment.
  const [postByModule, setPostByModule] = useState<Map<number, number>>(
    new Map(),
  );
  // Per-module progress as the backend counts it, keyed by module id. Empty
  // until the detail call lands (or if it fails), and statFor covers that gap.
  const [breakdown, setBreakdown] = useState<Map<number, ModuleBreakdown>>(
    new Map(),
  );
  const [passedAssessmentIds, setPassedAssessmentIds] = useState<Set<number>>(
    new Set(),
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [course, assessments, attempts] = await Promise.all([
          loadStaffCourse(courseId),
          loadAssessments(courseId).catch(() => []),
          loadAssessmentAttempts().catch(() => []),
        ]);

        setStaffCourse(course);

        const postMap = new Map<number, number>();
        for (const assessment of assessments) {
          if (assessment.type === "POST_TEST" && assessment.module != null) {
            postMap.set(assessment.module, assessment.id);
          }
        }
        setPostByModule(postMap);

        // Only attempts made under THIS enrollment count — passes from an
        // earlier delivery of the same course must not pre-complete a
        // re-assigned (refresher) run.
        const passed = new Set<number>();
        for (const attempt of attemptsForEnrollment(
          attempts,
          course?.enrollment,
        )) {
          if (attempt.passed) passed.add(attempt.assessment);
        }
        setPassedAssessmentIds(passed);

        // Separate call: modules_breakdown is only populated on the enrolment
        // detail endpoint, never on the list loadStaffCourse reads. Fired
        // after the page already has what it needs to render, so a slow or
        // failed response refines the module cards rather than delaying them.
        if (course?.enrollment.id != null) {
          setBreakdown(await loadModulesBreakdown(course.enrollment.id));
        }

        setError("");
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
  }, [courseId]);

  // Resolves the post-assessment gate for one module.
  const postGateFor = useCallback(
    (moduleId: number): PostGate => {
      const postId = postByModule.get(moduleId);
      return {
        required: postId !== undefined,
        passed: postId !== undefined && passedAssessmentIds.has(postId),
      };
    },
    [postByModule, passedAssessmentIds],
  );

  const orderedModules = useMemo(
    () =>
      (staffCourse?.modules ?? [])
        .slice()
        .sort((first, second) => first.order - second.order),
    [staffCourse?.modules],
  );

  const visibleModules = useMemo(() => {
    if (!staffCourse) return [];
    const query = search.trim().toLowerCase();

    return orderedModules.filter((module) => {
      const status = statFor(
        module,
        staffCourse.enrollment,
        postGateFor(module.id),
      ).status;
      const matchesTab =
        tab === "all" ||
        (tab === "completed" && status === "completed") ||
        (tab === "inprogress" && status === "inprogress");
      const matchesSearch =
        !query ||
        `${module.title} ${module.description ?? ""}`
          .toLowerCase()
          .includes(query);

      return matchesTab && matchesSearch;
    });
  }, [orderedModules, search, tab, staffCourse, postGateFor]);

  // Resume target: first not-yet-complete module, else the first module.
  const resumeModuleId = useMemo(() => {
    if (!staffCourse) return null;
    const firstIncomplete = orderedModules.find(
      (module) =>
        statFor(module, staffCourse.enrollment, postGateFor(module.id))
          .status !== "completed",
    );
    return (firstIncomplete ?? orderedModules[0])?.id ?? null;
  }, [orderedModules, staffCourse, postGateFor]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              <Skeleton className="h-28 w-full rounded-none" />
              <div className="space-y-3 p-5">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2.5 w-full rounded-full" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !staffCourse) {
    return (
      <div className="mx-auto max-w-6xl">
        <Link
          href="/staff/training"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-[#1a6b3c]"
        >
          <ArrowLeft size={16} /> Back to My Courses
        </Link>
        <div className="rounded-2xl border border-red-100 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-red-600">
            Course not available
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {error || "This course is not assigned to your account."}
          </p>
        </div>
      </div>
    );
  }

  const { enrollment, course } = staffCourse;
  const isLocked = course?.is_locked ?? false;

  // A module counts toward the course tally if it has any required step —
  // content items or a post-assessment. (A module with nothing to complete
  // must not sit in the denominator, or the count could never reach the total.)
  const contentModules = orderedModules.filter(
    (module) =>
      module.documents.length > 0 || postGateFor(module.id).required,
  );
  const moduleStats = contentModules.map((module) =>
    statFor(module, enrollment, postGateFor(module.id), breakdown.get(module.id)),
  );
  const completedModules = moduleStats.filter(
    (stat) => stat.status === "completed",
  ).length;

  // The backend's percentage now counts activities, live sessions and
  // post-tests, which is what this page used to recalculate for itself. Two
  // formulas meant the same course read 13% on the dashboard and 10% here, so
  // the local one is gone and there is a single number again.
  const courseProgress = toPercentage(enrollment.completion_percentage);
  const isCompleted =
    enrollment.status === "COMPLETED" || courseProgress >= 100;

  // The course evaluation is a mandatory closing "module" shown after all the
  // real modules. It links straight into the player's evaluation step; once
  // submitted, finishing there issues the certificate.
  const evaluationDone = enrollment.evaluation != null;
  const evalQuery = search.trim().toLowerCase();
  const showEvalCard =
    (tab === "all" || (tab === "completed" && evaluationDone)) &&
    (!evalQuery || "course evaluation feedback".includes(evalQuery));
  // The evaluation stays locked until every content module is complete (or the
  // backend reports the whole course at 100%). Once submitted it never re-locks.
  const allModulesDone =
    courseProgress >= 100 ||
    (contentModules.length > 0 && completedModules === contentModules.length);
  const evalLocked = !evaluationDone && !allModulesDone;

  // The backend refuses modules, activities, assessments and live sessions
  // outside the programme's dates, so say so plainly instead of letting the
  // page look broken.
  const trainingWindow = programmeWindow(staffCourse.cohortCourse);
  const windowDate =
    trainingWindow.state === "before"
      ? trainingWindow.startDate
      : trainingWindow.endDate;
  const formattedWindowDate = windowDate
    ? new Date(windowDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/staff/training"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-[#1a6b3c]"
      >
        <ArrowLeft size={16} /> Back to My Courses
      </Link>

      {trainingWindow.state !== "open" && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <CalendarDays
            size={18}
            className="mt-0.5 shrink-0 text-amber-700"
          />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">
              {trainingWindow.state === "before"
                ? formattedWindowDate
                  ? `This training opens on ${formattedWindowDate}`
                  : "This training has not opened yet"
                : formattedWindowDate
                  ? `This training closed on ${formattedWindowDate}`
                  : "This training has closed"}
            </p>
            <p className="mt-1">
              {trainingWindow.state === "before"
                ? "The modules, assessments and live sessions become available on that date. Nothing to do until then."
                : "Its modules, assessments and live sessions are no longer available. Any certificate you earned stays on your Certifications page."}
            </p>
          </div>
        </div>
      )}

      {/* Course hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a6b3c] via-[#177a41] to-[#0f5730] p-6 shadow-sm sm:p-8">
        <div className="absolute inset-0" style={DOT_TEXTURE} />
        <div className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25 backdrop-blur-sm">
                <CalendarDays size={13} />
                {enrollment.cohort_name}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25 backdrop-blur-sm">
                <Layers size={13} />
                {orderedModules.length} module
                {orderedModules.length === 1 ? "" : "s"}
              </span>
              {isCompleted ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700">
                  <CheckCircle2 size={13} /> Completed
                </span>
              ) : null}
            </div>

            <h1 className="text-2xl font-extrabold leading-tight text-white sm:text-3xl">
              {enrollment.course_title}
            </h1>
            {course?.description ? (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-green-50/90">
                {course.description}
              </p>
            ) : null}
          </div>

          <div className="w-full shrink-0 lg:w-72">
            <div className="rounded-xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm">
              <div className="mb-2 flex items-end justify-between text-white">
                <span className="text-xs font-medium text-green-50/90">
                  {completedModules} of {contentModules.length} modules done
                </span>
                <span className="text-2xl font-extrabold leading-none">
                  {courseProgress}%
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all duration-700 ease-out"
                  style={{ width: `${Math.max(courseProgress, 2)}%` }}
                />
              </div>

              {!isLocked && resumeModuleId ? (
                <Link
                  href={`/staff/course/${courseId}/learn?module=${resumeModuleId}`}
                  className="group mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-bold text-[#1a6b3c] shadow-sm transition hover:bg-green-50"
                >
                  {isCompleted ? (
                    <RotateCcw size={16} />
                  ) : (
                    <PlayCircle size={16} />
                  )}
                  {isCompleted
                    ? "Review Course"
                    : courseProgress > 0
                      ? "Resume Learning"
                      : "Start Learning"}
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {isLocked ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm font-medium text-amber-800">
          <Lock size={16} className="mt-0.5 shrink-0" />
          {course?.lock_reason ||
            "This course is currently locked. Please check back later."}
        </div>
      ) : null}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Course Modules</h2>
          <p className="text-sm text-gray-500">
            Work through each module in order to complete the course.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search modules..."
              className="w-full rounded-full border border-gray-200 py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]"
            />
          </div>

          <div className="flex shrink-0 items-center rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
            {(
              [
                { mode: "grid" as const, icon: LayoutGrid, label: "Grid view" },
                { mode: "list" as const, icon: List, label: "List view" },
              ]
            ).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                type="button"
                aria-label={label}
                aria-pressed={view === mode}
                onClick={() => setView(mode)}
                className={`flex h-8 w-9 items-center justify-center rounded-md transition ${
                  view === mode
                    ? "bg-[#1a6b3c] text-white"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-6 border-b border-gray-100">
        {(["all", "inprogress", "completed"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`border-b-2 pb-2.5 text-sm font-bold capitalize transition ${
              tab === item
                ? "border-[#1a6b3c] text-[#1a6b3c]"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {item === "completed"
              ? "Completed"
              : item === "inprogress"
                ? "In progress"
                : "All"}
          </button>
        ))}
      </div>

      {/* Modules */}
      {orderedModules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
          <BookOpen className="mx-auto mb-3 text-gray-300" size={42} />
          <p className="font-semibold text-gray-700">No modules yet</p>
          <p className="mt-1 text-sm text-gray-500">
            This course has no modules added yet. Please check back later.
          </p>
        </div>
      ) : visibleModules.length === 0 && !showEvalCard ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
          <Search className="mx-auto mb-3 text-gray-300" size={38} />
          <p className="font-semibold text-gray-700">No modules here</p>
          <p className="mt-1 text-sm text-gray-500">
            {tab === "completed"
              ? "You have not completed any modules yet."
              : tab === "inprogress"
                ? "You have no modules in progress right now."
                : "Try a different search term."}
          </p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visibleModules.map((module) => {
            const stat = statFor(module, enrollment, postGateFor(module.id));
            const { gradient, glow, Icon } = bannerFor(module.title);
            const moduleNumber =
              orderedModules.findIndex((item) => item.id === module.id) + 1;

            return (
              <div
                key={module.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gray-200 hover:shadow-xl"
              >
                <div
                  className={`relative h-28 overflow-hidden bg-gradient-to-br ${gradient}`}
                >
                  <div className="absolute inset-0" style={DOT_TEXTURE} />
                  <div
                    className={`absolute -right-8 -top-10 h-32 w-32 rounded-full ${glow} blur-2xl`}
                  />
                  <Icon
                    size={104}
                    strokeWidth={1.25}
                    className="absolute -bottom-3 right-1 text-white/15 transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
                    <span className="flex items-center gap-2 text-white">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                        Module
                      </span>
                      <span className="text-2xl font-extrabold leading-none">
                        {String(moduleNumber).padStart(2, "0")}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-gray-700 shadow-sm">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          stat.known ? STATUS_DOT[stat.status] : "bg-gray-300"
                        }`}
                      />
                      {stat.known ? STATUS_LABEL[stat.status] : "Status unknown"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <h3 className="mb-1.5 line-clamp-2 font-bold leading-snug text-gray-800 transition group-hover:text-[#1a6b3c]">
                    {module.title}
                  </h3>
                  <p className="mb-4 line-clamp-2 flex-1 text-sm leading-relaxed text-gray-500">
                    {module.description || "Open this module to begin."}
                  </p>

                  <div className="mb-4">
                    {!stat.known ? (
                      // The breakdown has not arrived. Zeros here would read as
                      // "nothing done", which is a claim we cannot make.
                      <p className="text-xs font-medium text-gray-400">
                        Progress unavailable
                      </p>
                    ) : (
                    <>
                    <div className="mb-1.5 flex items-center justify-between text-xs font-medium">
                      <span className="text-gray-500">
                        {stat.completed} of {stat.total} step
                        {stat.total === 1 ? "" : "s"}
                      </span>
                      <span
                        className={`font-bold ${
                          stat.status === "completed"
                            ? "text-emerald-600"
                            : "text-[#1a6b3c]"
                        }`}
                      >
                        {stat.percent}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          stat.status === "completed"
                            ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
                            : "bg-gradient-to-r from-emerald-500 to-[#1a6b3c]"
                        }`}
                        style={{ width: `${Math.max(stat.percent, 2)}%` }}
                      />
                    </div>
                    </>
                    )}
                  </div>

                  {stat.awaitingPost ? (
                    <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700">
                      <ClipboardCheck size={13} className="shrink-0" />
                      Post-assessment pending
                    </p>
                  ) : null}

                  <Link
                    href={`/staff/course/${courseId}/learn?module=${module.id}`}
                    className={`group/btn mt-auto flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all ${
                      stat.status === "completed"
                        ? "border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                        : "bg-[#1a6b3c] text-white shadow-sm hover:bg-[#155831] hover:shadow-md"
                    }`}
                  >
                    {stat.status === "completed" ? (
                      <>
                        <RotateCcw size={16} /> Review Module
                      </>
                    ) : (
                      <>
                        {stat.status === "inprogress"
                          ? "Continue Module"
                          : "Start Module"}
                        <ArrowRight
                          size={16}
                          className="transition-transform group-hover/btn:translate-x-1"
                        />
                      </>
                    )}
                  </Link>
                </div>
              </div>
            );
          })}

          {showEvalCard ? (
            <div
              className={`group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 ${
                evalLocked
                  ? ""
                  : "hover:-translate-y-1 hover:border-gray-200 hover:shadow-xl"
              }`}
            >
              <div
                className={`relative h-28 overflow-hidden bg-gradient-to-br ${
                  evalLocked
                    ? "from-gray-400 via-gray-500 to-gray-600"
                    : "from-amber-500 via-orange-600 to-rose-600"
                }`}
              >
                <div className="absolute inset-0" style={DOT_TEXTURE} />
                {!evalLocked ? (
                  <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-amber-300/40 blur-2xl" />
                ) : null}
                {evalLocked ? (
                  <Lock
                    size={92}
                    strokeWidth={1.25}
                    className="absolute -bottom-2 right-2 text-white/15"
                  />
                ) : (
                  <Star
                    size={104}
                    strokeWidth={1.25}
                    className="absolute -bottom-3 right-1 text-white/15 transition-transform duration-500 group-hover:scale-110"
                  />
                )}
                <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
                    Final Step
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-gray-700 shadow-sm">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        evaluationDone
                          ? "bg-emerald-500"
                          : evalLocked
                            ? "bg-gray-400"
                            : "bg-amber-500"
                      }`}
                    />
                    {evaluationDone
                      ? "Completed"
                      : evalLocked
                        ? "Locked"
                        : "Required"}
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h3 className="mb-1.5 line-clamp-2 font-bold leading-snug text-gray-800 transition group-hover:text-[#1a6b3c]">
                  Course Evaluation
                </h3>
                <p className="mb-4 line-clamp-2 flex-1 text-sm leading-relaxed text-gray-500">
                  {evalLocked
                    ? "Complete all modules above to unlock the course evaluation and your certificate."
                    : "Share your feedback to complete the course and unlock your certificate."}
                </p>

                {evalLocked ? (
                  <div className="mt-auto flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-gray-100 py-2.5 text-sm font-bold text-gray-400">
                    <Lock size={15} /> Complete all modules first
                  </div>
                ) : (
                  <Link
                    href={`/staff/course/${courseId}/learn?step=evaluation`}
                    className={`group/btn mt-auto flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all ${
                      evaluationDone
                        ? "border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                        : "bg-[#1a6b3c] text-white shadow-sm hover:bg-[#155831] hover:shadow-md"
                    }`}
                  >
                    {evaluationDone ? (
                      <>
                        <RotateCcw size={16} /> Review Feedback
                      </>
                    ) : (
                      <>
                        Start Evaluation
                        <ArrowRight
                          size={16}
                          className="transition-transform group-hover/btn:translate-x-1"
                        />
                      </>
                    )}
                  </Link>
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleModules.map((module) => {
            const stat = statFor(module, enrollment, postGateFor(module.id));
            const { gradient, Icon } = bannerFor(module.title);
            const moduleNumber =
              orderedModules.findIndex((item) => item.id === module.id) + 1;

            return (
              <div
                key={module.id}
                className="group flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-gray-200 hover:shadow-md sm:flex-row sm:items-center"
              >
                <div
                  className={`relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${gradient} text-white`}
                >
                  <div className="absolute inset-0" style={DOT_TEXTURE} />
                  <Icon
                    size={40}
                    strokeWidth={1.25}
                    className="absolute -bottom-1 -right-1 text-white/20"
                  />
                  <span className="relative text-xl font-extrabold">
                    {String(moduleNumber).padStart(2, "0")}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-bold text-gray-800 transition group-hover:text-[#1a6b3c]">
                      {module.title}
                    </h3>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold text-gray-600">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[stat.status]}`}
                      />
                      {STATUS_LABEL[stat.status]}
                    </span>
                    {stat.awaitingPost ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        <ClipboardCheck size={11} /> Post-assessment
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-sm text-gray-500">
                    {module.description || "Open this module to begin."}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-1.5 max-w-xs flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          stat.status === "completed"
                            ? "bg-emerald-500"
                            : "bg-[#1a6b3c]"
                        }`}
                        style={{ width: `${Math.max(stat.percent, 2)}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-xs font-medium text-gray-400">
                      {stat.completed}/{stat.total}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/staff/course/${courseId}/learn?module=${module.id}`}
                  className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${
                    stat.status === "completed"
                      ? "border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                      : "bg-[#1a6b3c] text-white shadow-sm hover:bg-[#155831]"
                  }`}
                >
                  {stat.status === "completed"
                    ? "Review"
                    : stat.status === "inprogress"
                      ? "Continue"
                      : "Start"}
                  <ArrowRight size={15} />
                </Link>
              </div>
            );
          })}

          {showEvalCard ? (
            <div
              className={`group flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition sm:flex-row sm:items-center ${
                evalLocked ? "" : "hover:border-gray-200 hover:shadow-md"
              }`}
            >
              <div
                className={`relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br text-white ${
                  evalLocked
                    ? "from-gray-400 via-gray-500 to-gray-600"
                    : "from-amber-500 via-orange-600 to-rose-600"
                }`}
              >
                <div className="absolute inset-0" style={DOT_TEXTURE} />
                {evalLocked ? (
                  <Lock size={24} className="relative" />
                ) : (
                  <Star size={26} className="relative" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-bold text-gray-800 transition group-hover:text-[#1a6b3c]">
                    Course Evaluation
                  </h3>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold text-gray-600">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        evaluationDone
                          ? "bg-emerald-500"
                          : evalLocked
                            ? "bg-gray-400"
                            : "bg-amber-500"
                      }`}
                    />
                    {evaluationDone
                      ? "Completed"
                      : evalLocked
                        ? "Locked"
                        : "Required"}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-sm text-gray-500">
                  {evalLocked
                    ? "Complete all modules to unlock the course evaluation and your certificate."
                    : "Share your feedback to complete the course and unlock your certificate."}
                </p>
              </div>

              {evalLocked ? (
                <div className="inline-flex shrink-0 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-400">
                  <Lock size={14} /> Locked
                </div>
              ) : (
                <Link
                  href={`/staff/course/${courseId}/learn?step=evaluation`}
                  className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${
                    evaluationDone
                      ? "border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                      : "bg-[#1a6b3c] text-white shadow-sm hover:bg-[#155831]"
                  }`}
                >
                  {evaluationDone ? "Review" : "Start"}
                  <ArrowRight size={15} />
                </Link>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
