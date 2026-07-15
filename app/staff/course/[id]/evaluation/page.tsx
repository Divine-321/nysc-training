"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/**
 * The course evaluation now lives as the final timeline step inside the course
 * player, so the learner never leaves the module flow. This route is kept for
 * direct links and notifications — it forwards into the player's evaluation
 * step (which still submits to /api/training/evaluations).
 */
export default function EvaluationRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/staff/course/${params.id}/learn?step=evaluation`);
  }, [params.id, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#1a6b3c]" />
        <p className="text-sm font-medium text-gray-500">
          Opening the course evaluation...
        </p>
      </div>
    </div>
  );
}
