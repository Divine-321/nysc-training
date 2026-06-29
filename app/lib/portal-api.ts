const DEFAULT_API_BASE_URL = "https://web-production-84896.up.railway.app";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;

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

export type LoginResponse = ApiEnvelope<AuthData>;

export type LoginCredentials = {
  login: string;
  password: string;
};

export type Trainer = {
  id: number;
  full_name: string;
  designation: string;
  organization: string;
  bio: string | null;
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
  created_at: string;
  is_locked?: boolean;
  lock_reason?: string | null;
  prerequisite_ids?: number[];
  prerequisites_data?: { id: number; title: string }[];
};

const SESSION_STORAGE_KEY = "nysc-auth-session";

async function apiFetch<T>(path: string, init?: RequestInit, token?: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const message = payload?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export async function loginUser(credentials: LoginCredentials) {
  return apiFetch<LoginResponse>("/api/accounts/auth/login/", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function clearSession() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function readApiList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];

  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Array.isArray((payload as { data: unknown }).data)
  ) {
    return (payload as { data: T[] }).data;
  }

  return [];
}

export function dedupeById<T extends { id: number }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

export function extractErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;

  const record = payload as Record<string, unknown>;

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
