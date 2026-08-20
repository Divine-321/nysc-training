"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Cpu,
  HeartPulse,
  Landmark,
  Layers,
  LayoutGrid,
  List,
  Lock,
  MessageSquare,
  RotateCcw,
  Rocket,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Skeleton } from "@/app/components/ui";
import {
  loadStaffCourses,
  toPercentage,
  type StaffCourse,
} from "@/app/lib/staff-learning";

// A course counts as completed once its progress hits 100%, even if the
// backend enrollment status has not been updated yet.
function isCourseCompleted(item: StaffCourse) {
  return (
    item.enrollment.status === "COMPLETED" ||
    toPercentage(item.enrollment.completion_percentage) >= 100
  );
}

function statusLabel(item: StaffCourse) {
  if (isCourseCompleted(item)) return "Completed";
  if (item.enrollment.status === "IN_PROGRESS") return "In progress";
  return "Not started";
}

// White glass pill on the banner, differentiated only by a coloured dot so it
// stays legible on top of any gradient.
function statusDotClass(item: StaffCourse) {
  if (isCourseCompleted(item)) return "bg-emerald-500";
  if (item.enrollment.status === "IN_PROGRESS")
    return "bg-blue-500 animate-pulse";
  return "bg-amber-500";
}

// --- Branded banner generation ------------------------------------------------
// Rather than repeat one stock photo across every course, each course gets a
// deterministic gradient + topic icon derived from its title. Same course =>
// same banner every time, but the library as a whole looks varied.

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

// Any Lucide icon, or our custom emblem, is usable as a banner icon.
type BannerIcon = ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;

// NYSC torch — a simplified, monochrome 2D line rendering of the emblem's
// central motif. Used as the default banner mark instead of a school cap,
// since this is a service corps rather than a school.
function NyscTorch({
  size = 24,
  strokeWidth = 1.5,
  className,
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* flame */}
      <path d="M12 2.2C13.2 4 14.2 5.4 14.2 6.6C14.2 7.8 13.2 8.6 12 8.6C10.8 8.6 9.8 7.8 9.8 6.6C9.8 5.4 10.8 4 12 2.2Z" />
      {/* cup */}
      <path d="M8.5 9H15.5L14 11H10Z" />
      {/* handle */}
      <path d="M10 11L10.8 20.5H13.2L14 11" />
      {/* grip bands */}
      <path d="M10.5 14.5H13.6" />
      <path d="M10.6 17H13.4" />
    </svg>
  );
}

const ICON_RULES: Array<[RegExp, BannerIcon]> = [
  [/induct|orient|onboard|welcome|prep/i, Rocket],
  [/safe|security|protect|risk|emergen/i, ShieldCheck],
  [/lead|manage|supervis|team|hr\b|human resource/i, Users],
  [/health|medical|first aid|wellness|hygien/i, HeartPulse],
  [/finance|budget|account|payroll|procure/i, Landmark],
  [/tech|digital|computer|\bit\b|software|data|cyber/i, Cpu],
  [/comm|writ|report|present|speak|media/i, MessageSquare],
  [/law|legal|policy|ethic|govern|complian|conduct/i, Scale],
  [/skill|develop|growth|capacity|profession/i, Sparkles],
];

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function bannerFor(item: StaffCourse) {
  const title = item.enrollment.course_title ?? "Course";
  const theme = BANNER_THEMES[hashString(title) % BANNER_THEMES.length];
  const rule = ICON_RULES.find(([pattern]) => pattern.test(title));
  const Icon = rule ? rule[1] : NyscTorch;
  return { ...theme, Icon };
}

// Subtle dotted texture laid over the gradient for depth.
const DOT_TEXTURE = {
  backgroundImage:
    "radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)",
  backgroundSize: "18px 18px",
} as const;

// Shared per-course derived values used by both the grid and list views.
function courseView(item: StaffCourse) {
  const courseId = item.course?.id ?? item.cohortCourse?.course;
  const progress = toPercentage(item.enrollment.completion_percentage);
  const completed = isCourseCompleted(item);
  // Prefer the backend's own counts: they cover live sessions and post-tests
  // as well as materials, which is what the percentage beside them measures.
  // Counting activity_completions ourselves only ever saw materials, so the
  // caption could read "1 of 8" next to a percentage derived from ten things.
  // The local count stays as a fallback for payloads without the new fields.
  const totalDocuments =
    item.enrollment.total_steps ??
    item.modules.reduce((total, mod) => total + mod.documents.length, 0);
  const completedDocuments =
    item.enrollment.completed_steps ??
    (
      item.enrollment.activity_completions ??
      item.enrollment.document_progress ??
      []
    ).filter((progressItem) => progressItem.is_completed).length;

  return {
    courseId,
    progress,
    completed,
    totalDocuments,
    completedDocuments,
    isLocked: item.course?.is_locked ?? false,
    lockReason: item.course?.lock_reason ?? null,
    ...bannerFor(item),
  };
}

function CourseGridCard({ item }: { item: StaffCourse }) {
  const {
    courseId,
    progress,
    completed,
    totalDocuments,
    completedDocuments,
    isLocked,
    lockReason,
    gradient,
    glow,
    Icon,
  } = courseView(item);

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gray-200 hover:shadow-xl">
      {/* Branded banner */}
      <div
        className={`relative h-44 overflow-hidden bg-gradient-to-br ${gradient}`}
      >
        <div className="absolute inset-0" style={DOT_TEXTURE} />
        <div
          className={`absolute -right-10 -top-12 h-44 w-44 rounded-full ${glow} blur-2xl`}
        />
        <div className="absolute -bottom-14 -left-8 h-44 w-44 rounded-full bg-white/10 blur-2xl" />

        <Icon
          size={132}
          strokeWidth={1.25}
          className="absolute -bottom-5 right-1 text-white/15 transition-transform duration-500 group-hover:scale-110"
        />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white ring-1 ring-white/30 backdrop-blur-sm">
            <Icon size={20} strokeWidth={2} />
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-gray-700 shadow-sm">
            <span
              className={`h-1.5 w-1.5 rounded-full ${statusDotClass(item)}`}
            />
            {statusLabel(item)}
          </span>
        </div>

        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30">
              <Lock size={22} className="text-white" />
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
            <CalendarDays size={13} className="text-[#1a6b3c]" />
            {item.enrollment.cohort_name}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
            <Layers size={13} className="text-[#1a6b3c]" />
            {item.modules.length} module
            {item.modules.length === 1 ? "" : "s"}
          </span>
        </div>

        <h3 className="mb-2 line-clamp-2 text-lg font-bold leading-snug text-gray-800 transition group-hover:text-[#1a6b3c]">
          {item.enrollment.course_title}
        </h3>

        <p className="mb-5 line-clamp-2 flex-1 text-sm leading-relaxed text-gray-500">
          {item.course?.description ||
            "Open this course to view activities and materials."}
        </p>

        {/* Progress */}
        <div className="mb-5 rounded-xl bg-gray-50 p-3.5">
          <div className="mb-2 flex items-end justify-between">
            <span className="text-xs font-medium text-gray-500">
              {completedDocuments} of {totalDocuments} step
              {totalDocuments === 1 ? "" : "s"} completed
            </span>
            <span
              className={`text-lg font-extrabold leading-none ${
                completed ? "text-emerald-600" : "text-[#1a6b3c]"
              }`}
            >
              {progress}%
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                completed
                  ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
                  : "bg-gradient-to-r from-emerald-500 to-[#1a6b3c]"
              }`}
              style={{ width: `${Math.max(progress, 2)}%` }}
            />
          </div>
        </div>

        {isLocked && lockReason && (
          <p className="mb-3 flex items-start gap-1.5 text-xs font-semibold text-amber-700">
            <Lock size={14} className="mt-0.5 shrink-0" />
            {lockReason}
          </p>
        )}

        {/* Action */}
        {isLocked ? (
          <div className="mt-auto flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-gray-50 py-3 text-sm font-bold text-gray-400">
            <Lock size={16} />
            Locked
          </div>
        ) : completed ? (
          courseId && (
            <Link
              href={`/staff/course/${courseId}`}
              className="group/btn mt-auto flex w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-600 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
            >
              <RotateCcw size={16} />
              Review Course
            </Link>
          )
        ) : (
          courseId && (
            <Link
              href={`/staff/course/${courseId}`}
              className="group/btn mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a6b3c] py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#155831] hover:shadow-md"
            >
              {progress > 0 ? "Resume Course" : "Start Course"}
              <ArrowRight
                size={16}
                className="transition-transform group-hover/btn:translate-x-1"
              />
            </Link>
          )
        )}
      </div>
    </div>
  );
}

function CourseListRow({ item }: { item: StaffCourse }) {
  const {
    courseId,
    progress,
    completed,
    totalDocuments,
    completedDocuments,
    isLocked,
    gradient,
    Icon,
  } = courseView(item);

  return (
    <div className="group flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-gray-200 hover:shadow-md sm:flex-row sm:items-center">
      <div
        className={`relative flex h-20 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${gradient} text-white sm:h-16 sm:w-24`}
      >
        <div className="absolute inset-0" style={DOT_TEXTURE} />
        <Icon size={30} strokeWidth={1.75} className="relative" />
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
            <Lock size={18} className="text-white" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-bold text-gray-800 transition group-hover:text-[#1a6b3c]">
            {item.enrollment.course_title}
          </h3>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold text-gray-600">
            <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(item)}`} />
            {statusLabel(item)}
          </span>
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={13} className="text-[#1a6b3c]" />
            {item.enrollment.cohort_name}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Layers size={13} className="text-[#1a6b3c]" />
            {item.modules.length} module{item.modules.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-1.5 max-w-sm flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                completed ? "bg-emerald-500" : "bg-[#1a6b3c]"
              }`}
              style={{ width: `${Math.max(progress, 2)}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-medium text-gray-400">
            {completedDocuments}/{totalDocuments} · {progress}%
          </span>
        </div>
      </div>

      {isLocked ? (
        <span className="inline-flex shrink-0 cursor-not-allowed items-center gap-2 rounded-xl border-2 border-gray-200 bg-gray-50 px-5 py-2.5 text-sm font-bold text-gray-400">
          <Lock size={15} /> Locked
        </span>
      ) : (
        courseId && (
          <Link
            href={`/staff/course/${courseId}`}
            className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${
              completed
                ? "border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                : "bg-[#1a6b3c] text-white shadow-sm hover:bg-[#155831]"
            }`}
          >
            {completed ? "Review" : progress > 0 ? "Resume" : "Start"}
            <ArrowRight size={15} />
          </Link>
        )
      )}
    </div>
  );
}

export default function StaffTraining() {
  const [tab, setTab] = useState<"all" | "inprogress" | "completed">("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [courses, setCourses] = useState<StaffCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setCourses(await loadStaffCourses());
        setError("");
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load your assigned courses.",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  const visibleCourses = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return courses.filter((item) => {
      const progress = toPercentage(item.enrollment.completion_percentage);
      const completed = isCourseCompleted(item);
      // "In progress" means genuinely started but not finished — a not-started
      // course belongs only under "All".
      const inProgress =
        !completed &&
        (progress > 0 || item.enrollment.status === "IN_PROGRESS");
      const matchesTab =
        tab === "all" ||
        (tab === "completed" && completed) ||
        (tab === "inprogress" && inProgress);
      const matchesSearch =
        !normalizedSearch ||
        `${item.enrollment.course_title} ${item.enrollment.cohort_name}`
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesTab && matchesSearch;
    });
  }, [courses, search, tab]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              My Assigned Courses
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              These are the courses connected to your cohort.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search courses..."
              className="w-full rounded-full border border-gray-200 py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]"
            />
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between gap-4 border-b border-gray-100">
          <div className="flex gap-6 sm:gap-8">
            {(["all", "inprogress", "completed"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`border-b-2 pb-3 text-sm font-bold capitalize transition ${
                  tab === item
                    ? "border-[#1a6b3c] text-[#1a6b3c]"
                    : "border-transparent text-gray-400"
                }`}
              >
                {item === "completed"
                  ? "Completed"
                  : item === "inprogress"
                    ? "In progress"
                    : item}
              </button>
            ))}
          </div>

          <div className="mb-2 hidden shrink-0 items-center rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm sm:flex">
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

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
              >
                <Skeleton className="h-44 w-full rounded-none" />
                <div className="p-5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-3 h-5 w-3/4" />
                  <Skeleton className="mt-3 h-4 w-full" />
                  <Skeleton className="mt-1.5 h-4 w-2/3" />
                  <Skeleton className="mt-5 h-2.5 w-full rounded-full" />
                  <Skeleton className="mt-5 h-11 w-full rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleCourses.length === 0 ? (
          <div className="rounded-xl bg-gray-50 p-8 text-center">
            <BookOpen className="mx-auto mb-3 text-gray-300" size={42} />
            <p className="font-semibold text-gray-700">
              No assigned courses found.
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Once an admin assigns your cohort to a course, it will appear here.
            </p>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibleCourses.map((item) => (
              <CourseGridCard key={item.enrollment.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleCourses.map((item) => (
              <CourseListRow key={item.enrollment.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
