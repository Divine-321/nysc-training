"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/**
 * Legacy route. The per-module reading experience now lives in the course
 * player, which shows exactly this module's items (pre-test → activities →
 * live session → post-test). This page only existed for the old model and
 * rendered new-model activities through the wrong viewer — redirect instead.
 */
export default function LegacyModuleRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    router.replace(
      `/staff/course/${params.id}/learn?module=${params.moduleId}`,
    );
  }, [params.id, params.moduleId, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#1a6b3c]" />
        <p className="text-sm font-medium text-gray-500">
          Opening this module in the course player...
        </p>
      </div>
    </div>
  );
}
