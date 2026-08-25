"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, Loader2, XCircle } from "lucide-react";
import { cachedFetchAll } from "@/app/lib/data-cache";
import { readApiList } from "@/app/lib/portal-api";
import {
  programmeWindow,
  type CourseEnrollment,
  type Programme,
} from "@/app/lib/staff-learning";

/**
 * Every training a staff member has ever been enrolled on, sorted into what
 * happened to each.
 *
 * Fetched per staff member rather than with the table: /enrollments accepts
 * ?staff=, so one small request when the panel opens beats downloading every
 * enrolment in the system to fill twenty rows.
 */

type Group = "completed" | "ongoing" | "closed";

type Row = {
  id: number;
  title: string;
  cohort: string;
  percentage: number;
  group: Group;
  window: ReturnType<typeof programmeWindow>;
};

const GROUPS: {
  key: Group;
  label: string;
  hint: string;
  icon: typeof CheckCircle2;
  tone: string;
}[] = [
  {
    key: "completed",
    label: "Completed",
    hint: "Finished",
    icon: CheckCircle2,
    tone: "text-green-600",
  },
  {
    key: "ongoing",
    label: "Ongoing",
    hint: "Still running",
    icon: CircleDashed,
    tone: "text-[#1a6b3c]",
  },
  {
    key: "closed",
    label: "Closed",
    hint: "Ended before it was finished",
    icon: XCircle,
    tone: "text-gray-400",
  },
];

const toPercentage = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Which of the three a training belongs to.
 *
 * Finished is checked first on purpose: someone who completed a training
 * before its end date has passed is Completed, not Closed. Testing the date
 * first would file everything they ever passed under "ended without
 * finishing", which reads as failure.
 */
const groupFor = (
  enrollment: CourseEnrollment,
  programme: Programme | null,
): Group => {
  const finished =
    enrollment.status === "COMPLETED" ||
    toPercentage(enrollment.completion_percentage) >= 100;

  if (finished) return "completed";

  return programmeWindow(programme).state === "after" ? "closed" : "ongoing";
};

const formatDates = (window: ReturnType<typeof programmeWindow>) => {
  const format = (value: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? null
      : parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const start = format(window.startDate);
  const end = format(window.endDate);

  if (start && end) return `${start} – ${end}`;
  return start ?? end ?? "";
};

export default function StaffTrainingHistory({
  staffId,
  programmes,
}: {
  staffId: string;
  programmes: Programme[];
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setRows(null);
      setError("");

      try {
        const response = await cachedFetchAll(
          `/api/training/enrollments?staff=${encodeURIComponent(staffId)}`,
        );

        if (!response.ok) throw new Error("Could not load trainings.");

        const payload = await response.json().catch(() => null);
        if (!active) return;

        const programmeById = new Map(
          programmes.map((programme) => [programme.id, programme]),
        );

        setRows(
          readApiList<CourseEnrollment>(payload)
            // The endpoint is scoped by ?staff=, but an unfiltered backend
            // would return everyone — never show one staff member another's.
            .filter((item) => String(item.staff) === String(staffId))
            .map((enrollment) => {
              const programme =
                programmeById.get(
                  (enrollment.programme ??
                    enrollment.cohort_course) as number,
                ) ?? null;

              return {
                id: enrollment.id,
                title:
                  programme?.course_details?.title?.trim() ||
                  enrollment.programme_title?.trim() ||
                  enrollment.course_title?.trim() ||
                  "Untitled training",
                cohort: enrollment.cohort_name?.trim() || "",
                percentage: toPercentage(enrollment.completion_percentage),
                group: groupFor(enrollment, programme),
                window: programmeWindow(programme),
              };
            }),
        );
      } catch {
        if (active) setError("Could not load this staff member's trainings.");
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [staffId, programmes]);

  if (error) {
    return (
      <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
    );
  }

  if (rows === null) {
    return (
      <p className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 size={15} className="animate-spin" />
        Loading trainings...
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-4 text-sm text-gray-500">
        This staff member has not been enrolled on any training yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {GROUPS.map((group) => {
        const items = rows.filter((row) => row.group === group.key);
        if (items.length === 0) return null;

        const Icon = group.icon;

        return (
          <div key={group.key}>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              {group.label}
              <span className="ml-1.5 font-medium normal-case tracking-normal text-gray-400">
                · {group.hint}
              </span>
            </p>

            <ul className="mt-2 space-y-1.5">
              {items.map((row) => {
                const dates = formatDates(row.window);

                return (
                  <li
                    key={row.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <Icon
                        size={15}
                        className={`mt-0.5 shrink-0 ${group.tone}`}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-800">
                          {row.title}
                        </p>
                        {(row.cohort || dates) && (
                          <p className="text-xs text-gray-500">
                            {[row.cohort, dates].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>

                    <span
                      className={`shrink-0 text-xs font-semibold ${
                        group.key === "completed"
                          ? "text-green-700"
                          : "text-gray-500"
                      }`}
                    >
                      {group.key === "completed"
                        ? "Complete"
                        : `${Math.round(row.percentage)}%`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
