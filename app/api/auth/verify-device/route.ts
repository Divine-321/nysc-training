import { NextResponse } from "next/server";
import { requiresDeviceVerification, verifyDevice } from "@/app/lib/portal-api";
import { setSessionCookies } from "@/app/lib/session-cookies";

/**
 * Second half of an admin login on an unrecognised device: exchanges the
 * emailed OTP for a session. Succeeds with the same payload as a normal login,
 * so the session cookies are written here exactly as they are there.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      otp?: string;
      device_id?: string;
    };

    if (!body.email || !body.otp || !body.device_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Email, verification code and device are all required.",
          data: null,
        },
        { status: 400 },
      );
    }

    const response = await verifyDevice({
      email: body.email,
      otp: body.otp,
      device_id: body.device_id,
    });

    // Shouldn't happen — verify-device either issues tokens or errors — but
    // never fall through to reading .tokens off a payload that has none.
    if (requiresDeviceVerification(response.data)) {
      return NextResponse.json(
        {
          success: false,
          message: "Device verification did not complete. Please log in again.",
          data: null,
        },
        { status: 401 },
      );
    }

    return setSessionCookies(
      NextResponse.json(response, { status: 200 }),
      response.data.tokens,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Verification failed. Please try again.";
    const status =
      message.toLowerCase().includes("fetch failed") ||
      message.toLowerCase().includes("failed to fetch")
        ? 502
        : 400;

    return NextResponse.json(
      {
        success: false,
        message:
          status === 502
            ? "Could not reach the backend. Please try again."
            : message,
        data: null,
      },
      { status },
    );
  }
}
