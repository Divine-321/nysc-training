import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/app/lib/portal-api";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("nysc_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { success: false, message: "Not authenticated.", data: null },
      { status: 401 }
    );
  }

  const response = await fetch(`${API_BASE_URL}/api/accounts/me/`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const payload = await response.json();

  return NextResponse.json(payload, { status: response.status });
}
