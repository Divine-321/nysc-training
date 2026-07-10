"use client";

import { useEffect, useState } from "react";
import { readApiList } from "@/app/lib/portal-api";
import type { CohortCourse } from "@/app/lib/staff-learning";
import LegacyCohortsManager from "./LegacyCohortsManager";
import TrainingProgrammesManager from "./TrainingProgrammesManager";

type CohortModel = "detecting" | "legacy" | "programmes";

/**
 * The backend restructure replaces dynamic Cohorts with fixed-batch Training
 * Programmes on the SAME cohort-courses endpoint, so the two models can't
 * coexist. This page sniffs which model the deployed backend speaks and
 * renders the matching UI — no redeploy needed on switchover day.
 */
async function detectCohortModel(): Promise<CohortModel> {
  try {
    const response = await fetch("/api/training/cohort-courses", {
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);

    if (response.ok) {
      const items = readApiList<CohortCourse>(payload);

      // New model: cohort is the batch string / a year field exists.
      if (
        items.some(
          (item) => typeof item.cohort === "string" || item.year !== undefined,
        )
      ) {
        return "programmes";
      }

      if (items.length > 0) return "legacy";
    }

    // Empty list is ambiguous — the old Cohort endpoint existing (401/200)
    // vs gone (404) settles it.
    const cohortsProbe = await fetch("/api/training/cohorts", {
      cache: "no-store",
    });

    return cohortsProbe.status === 404 ? "programmes" : "legacy";
  } catch {
    return "legacy";
  }
}

export default function CohortsPage() {
  const [model, setModel] = useState<CohortModel>("detecting");

  useEffect(() => {
    let active = true;

    void detectCohortModel().then((detected) => {
      if (active) setModel(detected);
    });

    return () => {
      active = false;
    };
  }, []);

  if (model === "detecting") {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
          Loading...
        </div>
      </div>
    );
  }

  if (model === "programmes") {
    return <TrainingProgrammesManager />;
  }

  return (
    <div className="space-y-4">
      <div className="mx-auto max-w-7xl rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
        The backend still runs the old cohort model. Once the Training
        Programme upgrade (fixed Batch A/B/C) is deployed, this page switches
        to the new interface automatically.
      </div>
      <LegacyCohortsManager />
    </div>
  );
}
