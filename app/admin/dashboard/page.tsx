"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Award,
  BookOpen,
  Calendar,
  CalendarRange,
  Clock,
  Layers,
  PlusCircle,
  UserCheck,
  UserCog,
  Users,
  Video,
} from "lucide-react";
import {
  collectTrainerNames,
  extractErrorMessage,
  readApiItem,
  readApiList,
  type LibraryModule,
} from "@/app/lib/portal-api";
import { formatDate, formatTime } from "@/app/lib/format";
import {
  normalizeLiveSession,
  type LiveSession,
} from "@/app/lib/staff-learning";
import { cachedFetch, cachedFetchAll } from "@/app/lib/data-cache";

type DashboardAnalytics = {
  totalNumberOfStaff: number;
  totalNumberOfActiveCourses: number;
  totalNumberOfTrainingProgrammes: number;
  totalNumberOfActiveTrainingProgrammes: number;
  totalNumberOfCertificatesAssigned: number;
  totalNumberOfDepartments: number;
  totalUpcomingLiveSessionsWithinMonth: number;
};

// The widget row after enrichment: module name + its trainer come from the
// module (the analytics payload has neither, so we source from live-sessions
// + modules directly).
type UpcomingSession = {
  id: number;
  title: string;
  moduleTitle: string | null;
  trainerName: string;
  cohortName: string;
  courseTitle: string;
  startTime: string;
  endTime: string;
  status: string;
};

const ACTIVE_SESSION_STATUSES = new Set(["SCHEDULED", "ONGOING"]);

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] =
    useState<DashboardAnalytics | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalModules, setTotalModules] = useState<number | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>(
    [],
  );

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const response = await cachedFetch("/api/analytics/dashboard");

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            extractErrorMessage(
              payload,
              `Could not load dashboard (HTTP ${response.status}).`
            )
          );
        }

        const data = readApiItem<DashboardAnalytics>(payload);

        if (!data) {
          throw new Error("The dashboard response was empty.");
        }

        setAnalytics(data);
        setError("");
      } catch {
        // The backend is frequently slow/unreachable (connection timeouts), so
        // lead with a plain-language explanation rather than a raw HTTP error.
        // Not logged to console: in dev that pops Next's error overlay for an
        // error we've already handled. The detail still shows in the network
        // tab and the server (proxy) logs.
        setError(
          "Couldn't load the latest figures — the server didn't respond in time. This is usually a temporary backend/connection issue. Refresh to try again.",
        );
      } finally {
        setLoading(false);
      }
    };

    // The analytics payload carries neither the module count nor the module/
    // trainer of each upcoming session, so we read the modules + live-sessions
    // lists directly and derive both. Trainer always comes from the module.
    const loadSessionsAndModules = async () => {
      try {
        const [modulesResponse, sessionsResponse] = await Promise.all([
          cachedFetchAll("/api/training/modules"),
          cachedFetchAll("/api/training/live-sessions"),
        ]);

        const modules = modulesResponse.ok
          ? readApiList<LibraryModule>(
              await modulesResponse.json().catch(() => null),
            )
          : [];

        setTotalModules(modulesResponse.ok ? modules.length : null);

        const moduleById = new Map(modules.map((module) => [module.id, module]));

        if (!sessionsResponse.ok) return;

        const now = Date.now();
        const sessions = readApiList<LiveSession>(
          await sessionsResponse.json().catch(() => null),
        )
          .map(normalizeLiveSession)
          .filter(
            (session) =>
              ACTIVE_SESSION_STATUSES.has(session.status) &&
              new Date(session.end_time).getTime() >= now,
          )
          .sort(
            (first, second) =>
              new Date(first.start_time).getTime() -
              new Date(second.start_time).getTime(),
          )
          .slice(0, 6)
          .map<UpcomingSession>((session) => {
            const sessionModule =
              session.module != null ? moduleById.get(session.module) : null;
            const trainerName =
              collectTrainerNames([sessionModule]).join(", ") ||
              session.trainer_name ||
              "No trainer assigned";

            return {
              id: session.id,
              title: session.title,
              moduleTitle: session.module_title || sessionModule?.title || null,
              trainerName,
              cohortName: session.cohort_name,
              courseTitle: session.course_title,
              startTime: session.start_time,
              endTime: session.end_time,
              status: session.status,
            };
          });

        setUpcomingSessions(sessions);
      } catch {
        // Leave defaults — the widget/count fall back gracefully.
      }
    };

    void loadAnalytics();
    void loadSessionsAndModules();
  }, []);

  const primaryStats = [
    {
      label: "Total Staff",
      value: analytics?.totalNumberOfStaff,
      description: "Registered staff accounts",
      icon: Users,
    },
    {
      label: "Active Courses",
      value: analytics?.totalNumberOfActiveCourses,
      description: "Published training courses",
      icon: BookOpen,
    },
    {
      label: "Active Training",
      value: analytics?.totalNumberOfActiveTrainingProgrammes,
      description: "Course deliveries running",
      icon: Layers,
    },
    {
      label: "Certificates Issued",
      value: analytics?.totalNumberOfCertificatesAssigned,
      description: "Generated certificates",
      icon: Award,
    },
  ];

  const secondaryStats = [
    {
      label: "Total Modules",
      value: totalModules ?? undefined,
    },
    {
      label: "Upcoming Sessions",
      value: analytics?.totalUpcomingLiveSessionsWithinMonth,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">
          Overview
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Current staff, course, cohort and training information.
        </p>
      </div>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {primaryStats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="rounded-xl bg-[#f0f7f3] p-3 text-[#1a6b3c]">
                  <Icon size={24} />
                </div>

                <p className="text-3xl font-extrabold text-[#1a6b3c]">
                  {loading ? "..." : (stat.value ?? "—")}
                </p>
              </div>

              <p className="text-sm font-bold text-gray-700">
                {stat.label}
              </p>

              <p className="mt-1 text-xs text-gray-400">
                {stat.description}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {secondaryStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-semibold text-gray-500">
              {stat.label}
            </p>

            <p className="mt-2 text-3xl font-extrabold text-[#1a6b3c]">
              {loading ? "..." : (stat.value ?? "—")}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 p-6">
          <Video size={20} className="text-[#1a6b3c]" />

          <h3 className="text-lg font-bold text-gray-800">
            Upcoming Live Sessions
          </h3>
        </div>

        {loading ? (
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-2xl border border-gray-100 p-5"
              >
                <div className="h-4 w-1/2 rounded bg-gray-100" />
                <div className="mt-3 h-3 w-1/3 rounded bg-gray-100" />
                <div className="mt-5 h-3 w-2/3 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : upcomingSessions.length ? (
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            {upcomingSessions.map((session) => (
              <div
                key={session.id}
                className="group flex flex-col rounded-2xl border border-gray-100 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="min-w-0 text-base font-bold leading-snug text-gray-900">
                    {session.moduleTitle ?? session.title}
                  </h4>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                      session.status === "ONGOING"
                        ? "bg-red-50 text-red-600"
                        : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {session.status === "ONGOING" ? "Live now" : "Upcoming"}
                  </span>
                </div>

                {session.moduleTitle ? (
                  <p className="mt-0.5 truncate text-xs text-gray-400">
                    {session.title}
                  </p>
                ) : null}

                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f0f7f3] text-[#1a6b3c]">
                    <UserCheck size={14} />
                  </span>
                  <span className="min-w-0 truncate font-semibold text-gray-700">
                    {session.trainerName}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-gray-100 pt-3 text-xs font-medium text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-gray-400" />
                    {formatDate(session.startTime)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} className="text-gray-400" />
                    {formatTime(session.startTime)} –{" "}
                    {formatTime(session.endTime)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Layers size={13} className="text-gray-400" />
                    {session.cohortName}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-8 text-center text-sm text-gray-500">
            No upcoming live sessions.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Link
          href="/admin/courses/create"
          className="rounded-2xl bg-[#1a6b3c] p-6 text-white shadow-sm transition hover:bg-[#145530]"
        >
          <PlusCircle size={32} className="mb-4 text-green-200" />

          <h3 className="text-lg font-bold">Create Course</h3>

          <p className="mt-1 text-sm text-green-100">
            Add a course and its modules.
          </p>
        </Link>

        <Link
          href="/admin/modules"
          className="rounded-2xl bg-blue-600 p-6 text-white shadow-sm transition hover:bg-blue-700"
        >
          <Layers size={32} className="mb-4 text-blue-200" />

          <h3 className="text-lg font-bold">Manage Modules</h3>

          <p className="mt-1 text-sm text-blue-100">
            Build reusable modules in the library.
          </p>
        </Link>

        <Link
          href="/admin/cohorts"
          className="rounded-2xl bg-yellow-500 p-6 text-white shadow-sm transition hover:bg-yellow-600"
        >
          <CalendarRange size={32} className="mb-4 text-yellow-100" />

          <h3 className="text-lg font-bold">Manage Training</h3>

          <p className="mt-1 text-sm text-yellow-100">
            Deliver courses to cohorts (e.g. January 2026).
          </p>
        </Link>

        <Link
          href="/admin/users"
          className="rounded-2xl bg-red-600 p-6 text-white shadow-sm transition hover:bg-red-700"
        >
          <UserCog size={32} className="mb-4 text-red-200" />

          <h3 className="text-lg font-bold">Manage Staff</h3>

          <p className="mt-1 text-sm text-red-100">
            View staff and cohort assignments.
          </p>
        </Link>
      </div>

    </div>
  );
}