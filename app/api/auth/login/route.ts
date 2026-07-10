import { NextResponse } from "next/server";
import { loginUser } from "@/app/lib/portal-api";

const isProduction = process.env.NODE_ENV === "production";
const ACCESS_TOKEN_MAX_AGE = 60 * 20;
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      login?: string;
      password?: string;
      role?: "staff" | "admin";
    };

    if (!body.login || !body.password) {
      return NextResponse.json(
        { success: false, message: "Login and password are required.", data: null },
        { status: 400 }
      );
    }

    const response = await loginUser({
      login: body.login,
      password: body.password,
      // Backend requires a portal role; default to the staff portal.
      role: body.role === "admin" ? "admin" : "staff",
    });

    const nextResponse = NextResponse.json(response, { status: 200 });

    nextResponse.cookies.set("nysc_access_token", response.data.tokens.access, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    nextResponse.cookies.set("nysc_refresh_token", response.data.tokens.refresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    return nextResponse;
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
