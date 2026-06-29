"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Award,
  BookOpen,
  Calendar,
  Clock,
  Layers,
  PlusCircle,
  UserCog,
  Users,
  Video,
} from "lucide-react";
import {
  extractErrorMessage,
  readApiItem,
} from "@/app/lib/portal-api";
import { formatDate, formatTime } from "@/app/lib/format";

type UpcomingLiveClass = {
  id: number;
  cohort_course: number;
  course_title: string;
  cohort_name: string;
  title: string;
  description: string | null;
  meeting_url: string;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
};

type DashboardAnalytics = {
  totalNumberOfStaff: number;
  totalNumberOfActiveCourses: number;
  totalNumberOfCohorts: number;
  totalNumberOfActiveCohorts: number;
  totalNumberOfCertificatesAssigned: number;
  totalNumberOfDepartments: number;
  totalUpcomingLiveSessionsWithinMonth: number;
  upcomingLiveClasses: UpcomingLiveClass[];
};

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] =
    useState<DashboardAnalytics | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const response = await fetch("/api/analytics/dashboard", {
          cache: "no-store",
        });

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
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load dashboard."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadAnalytics();
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
      label: "Total Cohorts",
      value: analytics?.totalNumberOfCohorts,
      description: "All training cohorts",
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
      label: "Active Cohorts",
      value: analytics?.totalNumberOfActiveCohorts,
    },
    {
      label: "Departments",
      value: analytics?.totalNumberOfDepartments,
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
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
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
                  {loading ? "..." : (stat.value ?? 0)}
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {secondaryStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-semibold text-gray-500">
              {stat.label}
            </p>

            <p className="mt-2 text-3xl font-extrabold text-[#1a6b3c]">
              {loading ? "..." : (stat.value ?? 0)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
          href="/admin/cohorts"
          className="rounded-2xl bg-yellow-500 p-6 text-white shadow-sm transition hover:bg-yellow-600"
        >
          <Layers size={32} className="mb-4 text-yellow-100" />

          <h3 className="text-lg font-bold">Manage Cohorts</h3>

          <p className="mt-1 text-sm text-yellow-100">
            Create and manage training cohorts.
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

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 p-6">
          <Video size={20} className="text-[#1a6b3c]" />

          <h3 className="text-lg font-bold text-gray-800">
            Upcoming Live Classes
          </h3>
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-gray-500">
            Loading upcoming classes...
          </p>
        ) : analytics?.upcomingLiveClasses.length ? (
          <ul className="divide-y divide-gray-100">
            {analytics.upcomingLiveClasses.map((session) => (
              <li
                key={session.id}
                className="p-6 transition hover:bg-gray-50"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div>
                    <h4 className="font-bold text-gray-800">
                      {session.title}
                    </h4>

                    <p className="mt-1 text-sm font-medium text-[#1a6b3c]">
                      {session.course_title}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Cohort: {session.cohort_name}
                    </p>
                  </div>

                  <span className="h-fit rounded-md bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    {session.status}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-5 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    {formatDate(session.start_time)}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Clock size={14} />
                    {formatTime(session.start_time)} –{" "}
                    {formatTime(session.end_time)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-8 text-center text-sm text-gray-500">
            No upcoming live classes in the next 30 days.
          </p>
        )}
      </div>
    </div>
  );
}