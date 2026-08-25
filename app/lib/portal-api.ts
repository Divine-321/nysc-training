import { invalidate } from "@/app/lib/data-cache";

// Which backend this frontend talks to. Set it per environment:
//   local dev  -> .env.local (copy .env.example)
//   Vercel     -> the project's environment variables
//
// There is deliberately no fallback. A missing value has to fail loudly,
// because the only sensible default would be production - and a test or
// preview deploy silently reading and writing the production database is far
// worse than a build that refuses to start.
const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!configuredApiBaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_API_BASE_URL is not set. Copy .env.example to .env.local for " +
      "local development, or set it in the Vercel project settings.",
  );
}

export const API_BASE_URL = configuredApiBaseUrl;

export function resolveMediaUrl(
  url: string | null | undefined,
  fallback = "/1-blank-profile.png",
) {
  if (!url) return fallback;

  if (url.startsWith("/media/")) {
    return `${API_BASE_URL}${url}`;
  }

  if (url.startsWith("media/")) {
    return `${API_BASE_URL}/${url}`;
  }

  return url;
}

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data: T;
};

export type AuthUser = {
  id: number;
  file_number: string | null;
  email: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  role: "staff" | "admin" | "superadmin";
  is_active: boolean;
  profile: {
    phone_number: string;
    profile_picture_url: string | null;
    sex: "male" | "female" | "";
    date_of_birth: string | null;
    employment_date: string | null;
  };
  created_at: string;
  updated_at: string;
};

export type AuthData = {
  tokens: {
    access: string;
    refresh: string;
  };
  user: AuthUser;
};

/**
 * An admin signing in from a browser the backend doesn't recognise gets a 200
 * with this instead of tokens: no session yet, an OTP has been emailed, and the
 * caller must finish via verify-device.
 */
export type DeviceVerificationRequired = {
  requires_device_verification: true;
  /** Masked address for display, e.g. "n***@gmail.com". */
  email_hint?: string;
};

export type LoginResponse = ApiEnvelope<AuthData | DeviceVerificationRequired>;

export function requiresDeviceVerification(
  data: AuthData | DeviceVerificationRequired | null | undefined,
): data is DeviceVerificationRequired {
  return Boolean(
    data && (data as DeviceVerificationRequired).requires_device_verification,
  );
}

export type LoginCredentials = {
  login: string;
  password: string;
  /** Portal gate required by the backend: "staff" or "admin". */
  role: "staff" | "admin";
  /** Required for role "admin"; ignored for staff. */
  device_id?: string;
};

export type VerifyDeviceCredentials = {
  /** The admin's full email — not the masked hint from the login response. */
  email: string;
  otp: string;
  device_id: string;
};

export type Trainer = {
  id: number;
  full_name: string;
  designation: string;
  organization: string;
  bio: string | null;
};

/** A reusable Module from the Module Library (no longer owned by a Course). */
export type LibraryModule = {
  id: number;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  cloudinary_public_id?: string | null;
  activities?: unknown[];
  /** Module-level trainers (deployed 2026-07-14); write via trainer_ids. */
  trainers?: Trainer[];
  created_at?: string;
};

/**
 * Course↔Module link (reusable-modules restructure, live 2026-07-12).
 * One row of the M2M through table: which module, at which position.
 */
export type CourseModuleLink = {
  id: number;
  module: number;
  order: number;
  module_details: LibraryModule;
};

export type Course = {
  id: number;
  title: string;
  description: string;
  thumbnail_url: string | null;
  cloudinary_public_id?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  category: number | null;
  category_name: string;
  created_by: number;
  trainers: Trainer[];
  /** Ordered reusable modules attached to this course (M2M through table). */
  assigned_modules?: CourseModuleLink[];
  created_at: string;
  is_locked?: boolean;
  lock_reason?: string | null;
  prerequisite_ids?: number[];
  prerequisites_data?: { id: number; title: string }[];
};

/** The course's module links sorted by their per-course order. */
export function sortedAssignedModules(
  course: Pick<Course, "assigned_modules"> | null | undefined,
): CourseModuleLink[] {
  return (course?.assigned_modules ?? [])
    .slice()
    .sort((first, second) => first.order - second.order);
}

/**
 * Trainers are assigned to Modules (the single source of truth). Given a list
 * of module-shaped objects, return the de-duplicated trainer names, in order —
 * used everywhere a Course or delivery needs to show "its" trainers, all
 * derived from the modules rather than the course.
 */
export function collectTrainerNames(
  modules: ({ trainers?: Trainer[] | null } | null | undefined)[],
): string[] {
  const names: string[] = [];

  for (const item of modules) {
    for (const trainer of item?.trainers ?? []) {
      if (trainer.full_name && !names.includes(trainer.full_name)) {
        names.push(trainer.full_name);
      }
    }
  }

  return names;
}

const SESSION_STORAGE_KEY = "nysc-auth-session";

export function clearSession() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  // Cached responses hold the previous account's data. Without this, signing
  // in as someone else on the same browser could show their lists until the
  // entries aged out.
  invalidate();
}

/**
 * Pulls the rows out of a list response, whichever shape the backend used.
 *
 * Four shapes are in play across the API and endpoints keep moving between
 * them as pagination is rolled out, so unwrap them all rather than tracking
 * which endpoint is on which:
 *   [...]                                    bare array
 *   { data: [...] }                          envelope
 *   { count, next, previous, results: [] }   paginated, no envelope
 *   { data: { count, ..., results: [] } }    paginated inside the envelope
 */
export function readApiList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];

  if (!payload || typeof payload !== "object") return [];

  const record = payload as Record<string, unknown>;

  if (Array.isArray(record.results)) return record.results as T[];

  if (Array.isArray(record.data)) return record.data as T[];

  if (record.data && typeof record.data === "object") {
    const nested = (record.data as Record<string, unknown>).results;
    if (Array.isArray(nested)) return nested as T[];
  }

  return [];
}

export function dedupeById<T extends { id: number }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

export function extractErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;

  const record = payload as Record<string, unknown>;

  // The backend envelope often puts a generic label in `message` ("Validation
  // Error") with the real reason nested in `data` (e.g. {message: "Validation
  // Error", data: {error: ["No active assessment attempt found..."]}}). Dig
  // out the nested detail first so users see the actual cause.
  if (record.data && typeof record.data === "object") {
    const detail = extractErrorMessage(record.data, "");
    if (detail) return detail;
  }

  if (typeof record.message === "string") return record.message;
  if (typeof record.detail === "string") return record.detail;
  if (
    record.error &&
    typeof record.error === "object" &&
    "message" in record.error &&
    typeof (record.error as { message: unknown }).message === "string"
  ) {
    return (record.error as { message: string }).message;
  }
  if (
    record.error &&
    typeof record.error === "object" &&
    "detail" in record.error &&
    typeof (record.error as { detail: unknown }).detail === "string"
  ) {
    return (record.error as { detail: string }).detail;
  }

  for (const value of Object.values(record)) {
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    if (typeof value === "string") return value;
  }

  return fallback;
}

export function readApiItem<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== "object") return (payload as T) ?? null;

  if ("data" in payload) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

/** The `next` link of a DRF page, wherever the envelope puts it. */
function readApiNext(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;

  if (typeof record.next === "string") return record.next;

  if (record.data && typeof record.data === "object") {
    const nested = (record.data as Record<string, unknown>).next;
    if (typeof nested === "string") return nested;
  }

  return null;
}

/**
 * Read every page of a paginated list endpoint.
 *
 * DRF paginates by default, so a plain fetch of a list URL returns only the
 * first 20 records. Filtering that in the browser silently hides everything
 * past the first page — records that still exist and still enforce their
 * uniqueness constraints, but that no screen ever shows.
 *
 * `next` is not followed directly: it is an absolute backend URL, and browser
 * calls go through this app's /api proxy. Pages are requested by number
 * instead, stopping as soon as a page reports no successor.
 */
export async function fetchAllPages<T>(
  path: string,
  fetcher: (url: string) => Promise<Response>,
  options: { pageSize?: number; maxPages?: number; errorMessage?: string } = {},
): Promise<T[]> {
  const {
    pageSize = 100,
    // A ceiling so a backend that always reports a next page cannot spin
    // forever. 50 pages of 100 is far beyond any list this app shows.
    maxPages = 50,
    errorMessage = "Could not load the list.",
  } = options;

  const joiner = path.includes("?") ? "&" : "?";
  const items: T[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const response = await fetcher(
      `${path}${joiner}page=${page}&page_size=${pageSize}`,
    );
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      // A failure on the first page is a real error; later pages may simply
      // be past the end on a backend that 404s rather than returning empty.
      if (page === 1) {
        throw new Error(extractErrorMessage(payload, errorMessage));
      }
      break;
    }

    const batch = readApiList<T>(payload);
    items.push(...batch);

    if (batch.length === 0 || !readApiNext(payload)) break;
  }

  return items;
}
