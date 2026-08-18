import { NextResponse } from "next/server";
import { requiresDeviceVerification } from "@/app/lib/portal-api";
import { loginUser } from "@/app/lib/auth-api";
import { setSessionCookies } from "@/app/lib/session-cookies";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      login?: string;
      password?: string;
      role?: "staff" | "admin";
      device_id?: string;
    };

    if (!body.login || !body.password) {
      return NextResponse.json(
        { success: false, message: "Login and password are required.", data: null },
        { status: 400 }
      );
    }

    const role = body.role === "admin" ? "admin" : "staff";

    const response = await loginUser({
      login: body.login,
      password: body.password,
      // Backend requires a portal role; default to the staff portal.
      role,
      // Admin logins are device-gated; the backend ignores this for staff.
      ...(body.device_id ? { device_id: body.device_id } : {}),
    });

    // An unrecognised admin device gets a 200 with no tokens — an OTP has been
    // emailed instead. Pass it through untouched so the caller can show the
    // verification step; there is no session to store yet.
    if (requiresDeviceVerification(response.data)) {
      return NextResponse.json(response, { status: 200 });
    }

    return setSessionCookies(
      NextResponse.json(response, { status: 200 }),
      response.data.tokens,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Login failed. Please try again.";
    const status =
      message.toLowerCase().includes("fetch failed") ||
      message.toLowerCase().includes("failed to fetch")
        ? 502
        : 401;

    return NextResponse.json(
      {
        success: false,
        message:
          status === 502
            ? "Could not reach the backend login service. Please try again."
            : message,
        data: null,
      },
      { status }
    );
  }
}
