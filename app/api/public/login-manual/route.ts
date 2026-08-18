import { existsSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { browserHeaders } from "@/app/lib/forwarded-headers";
import { API_BASE_URL, readApiList } from "@/app/lib/portal-api";
import { LOGIN_MANUAL_MARKER } from "@/app/lib/login-manual";

// Public lookup of the portal user manual shown as a popup on the login page.
//
// Preferred source: a STATIC file shipped with the frontend at
// `public/login-manual.pdf` — drop the PDF there and the popup works with no
// backend involvement at all (the backend books API can stay fully
// authenticated). If the static file is absent, we fall back to the
// admin-attached learning "book" whose title starts with LOGIN_MANUAL_MARKER.

const STATIC_MANUAL_FILE = "login-manual.pdf";

type Book = {
  id: number;
  title: string;
  description: string | null;
  file_url: string;
};

export async function GET() {
  // 1) Static manual bundled with the frontend.
  if (existsSync(join(process.cwd(), "public", STATIC_MANUAL_FILE))) {
    return NextResponse.json({
      success: true,
      data: {
        id: 0,
        title: "Portal User Manual",
        description:
          "How to register, log in and use the NYSC E-Training Portal.",
        file_url: `/${STATIC_MANUAL_FILE}`,
      },
    });
  }

  // 2) Fallback: admin-attached book (requires public read on the backend).
  try {
    const response = await fetch(`${API_BASE_URL}/api/learning/books/`, {
      headers: { ...(await browserHeaders()), Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ success: true, data: null });
    }

    const payload = await response.json().catch(() => null);
    // Books became paginated ({count, next, previous, results}) — readApiList
    // unwraps that as well as the older bare-array and envelope shapes.
    const books = readApiList<Book>(payload);

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
