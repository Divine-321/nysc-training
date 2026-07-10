import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/app/lib/portal-api";
import { LOGIN_MANUAL_MARKER } from "@/app/lib/login-manual";

// Public lookup of the portal user manual shown as a popup on the login page.
// The manual is stored as a learning "book" whose title starts with the
// LOGIN_MANUAL_MARKER prefix (attached by an admin from Admin Settings).
//
// NOTE: the backend books list currently requires authentication. This route
// calls it WITHOUT a token so the login page (which has no session) can ask
// for the manual; until the backend allows public read access for it, this
// simply returns null and the popup stays hidden.

type Book = {
  id: number;
  title: string;
  description: string | null;
  file_url: string;
};

export async function GET() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/learning/books/`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ success: true, data: null });
    }

    const payload = await response.json().catch(() => null);
    const books: Book[] = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

    const manual =
      books.find((book) => book.title?.startsWith(LOGIN_MANUAL_MARKER)) ?? null;

    return NextResponse.json({
      success: true,
      data: manual
        ? {
            id: manual.id,
            title: manual.title.replace(LOGIN_MANUAL_MARKER, "").trim(),
            description: manual.description,
            file_url: manual.file_url,
          }
        : null,
    });
  } catch {
    return NextResponse.json({ success: true, data: null });
  }
}
