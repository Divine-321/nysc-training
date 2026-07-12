/**
 * Admin-side client for the Activity layer of the Course -> Module -> Activity
 * restructure (Phase 2).
 *
 * The new backend endpoint (/api/training/activities) has NOT shipped yet, so
 * every write goes through a feature check first:
 *   - new API live   -> /api/training/activities
 *   - new API absent -> /api/training/module-docs (legacy) with the same
 *     forward-compatible payload (both field sets are always sent)
 *
 * The switchover therefore happens automatically the day the backend ships —
 * no frontend change required.
 */

import { extractErrorMessage } from "@/app/lib/portal-api";
import type {
  Activity as ViewerActivity,
  ActivityContentType,
} from "@/app/lib/training-types";

export type LegacyDocType = "VIDEO" | "PDF" | "PPT" | "IMAGE" | "OTHER";

/**
 * One learning resource inside a module, as the admin builder sees it. Carries
 * the legacy module-doc fields and the new-model fields so it can represent a
 * record from either backend.
 */
export type AdminActivity = {
  id: number;
  module: number;
  title: string;
  order: number;
  // Legacy (module-docs) fields
  doc_type?: LegacyDocType;
  file_url?: string | null;
  cloudinary_public_id?: string | null;
  // New-model (activities) fields
  content_type?: ActivityContentType;
  content_url?: string | null;
  text_content?: string | null;
  /** Linked assessment for ASSESSMENT-type activities (either spelling). */
  assessment?: number | null;
  assessment_id?: number | null;
};

export type ActivityWriteInput = {
  module: number;
  title: string;
  order: number;
  content_type: ActivityContentType;
  content_url: string | null;
  text_content: string | null;
  doc_type: LegacyDocType;
  cloudinary_public_id: string | null;
  assessment_id?: number | null;
};

// Cached for the lifetime of the page load; the answer only changes when the
// backend deploys the restructure.
let activitiesApiLive: boolean | null = null;

export async function isActivitiesApiLive(): Promise<boolean> {
  if (activitiesApiLive !== null) return activitiesApiLive;

  try {
    const response = await fetch("/api/training/activities", {
      cache: "no-store",
    });
    activitiesApiLive = response.ok;
  } catch {
    activitiesApiLive = false;
  }

  return activitiesApiLive;
}

async function activityBasePath(): Promise<string> {
  return (await isActivitiesApiLive())
    ? "/api/training/activities"
    : "/api/training/module-docs";
}

/** Both field sets are always sent; each backend ignores the other's fields. */
function toPayload(input: ActivityWriteInput) {
  return {
    module: input.module,
    title: input.title,
    order: input.order,
    // legacy fields (current module-docs backend)
    doc_type: input.doc_type,
    file_url: input.content_type === "TEXT" ? null : input.content_url,
    cloudinary_public_id: input.cloudinary_public_id,
    // new-model fields (activities backend)
    content_type: input.content_type,
    content_url: input.content_url,
    text_content: input.text_content,
    // both spellings until the serializer field name is confirmed
    assessment_id: input.assessment_id ?? null,
    assessment: input.assessment_id ?? null,
  };
}

async function sendJson(
  method: "POST" | "PATCH",
  path: string,
  body: unknown,
  fallbackMessage: string,
): Promise<void> {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(extractErrorMessage(payload, fallbackMessage));
  }
}

export async function createActivity(
  input: ActivityWriteInput,
): Promise<void> {
  await sendJson(
    "POST",
    await activityBasePath(),
    toPayload(input),
    "The activity could not be saved.",
  );
}

export async function updateActivity(
  id: number,
  input: ActivityWriteInput,
): Promise<void> {
  await sendJson(
    "PATCH",
    `${await activityBasePath()}/${id}`,
    toPayload(input),
    "The activity could not be updated.",
  );
}

export async function deleteActivity(id: number): Promise<void> {
  const response = await fetch(`${await activityBasePath()}/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(
      extractErrorMessage(payload, "Could not delete this activity."),
    );
  }
}

/** Swaps two activities' order values (used by the up/down arrows). */
export async function swapActivityOrder(
  first: Pick<AdminActivity, "id" | "order">,
  second: Pick<AdminActivity, "id" | "order">,
): Promise<void> {
  const base = await activityBasePath();

  const responses = await Promise.all([
    fetch(`${base}/${first.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: second.order }),
    }),
    fetch(`${base}/${second.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: first.order }),
    }),
  ]);

  if (responses.some((response) => !response.ok)) {
    throw new Error("Could not reorder activities.");
  }
}

/** Resolves an activity's content type, falling back to the legacy doc_type. */
export function activityContentType(
  activity: AdminActivity,
): ActivityContentType {
  if (activity.content_type) return activity.content_type;

  switch (activity.doc_type) {
    case "VIDEO":
      return "VIDEO";
    case "PPT":
      return "PPT";
    case "PDF":
    case "IMAGE":
      return "PDF";
    default:
      return activity.file_url ? "EXTERNAL" : "TEXT";
  }
}

export function activityUrl(activity: AdminActivity): string {
  return activity.content_url ?? activity.file_url ?? "";
}

/** Maps either-model records onto the shape the shared ActivityViewer renders. */
export function toViewerActivity(
  activity: AdminActivity,
): Pick<
  ViewerActivity,
  "title" | "content_type" | "content_url" | "text_content"
> {
  return {
    title: activity.title,
    content_type: activityContentType(activity),
    content_url: activityUrl(activity) || null,
    text_content: activity.text_content ?? null,
  };
}
