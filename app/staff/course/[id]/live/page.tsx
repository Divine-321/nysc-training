"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/**
 * Live sessions are now timeline steps inside each module in the course player,
 * so joining happens without leaving the module flow. This route is kept for
 * direct links and notifications — it forwards into the player, landing on the
 * course's live-session step (attendance is still recorded via the backend
 * join endpoint from there).
 */
export default function LiveSessionsRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/staff/course/${params.id}/learn?step=live`);
  }, [params.id, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#1a6b3c]" />
        <p className="text-sm font-medium text-gray-500">
          Opening your live sessions...
        </p>
      </div>
    </div>
  );
}
