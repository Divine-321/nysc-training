import { NextResponse } from "next/server";
import { loginUser } from "@/app/lib/portal-api";

const isProduction = process.env.NODE_ENV === "production";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { login?: string; password?: string };

    if (!body.login || !body.password) {
      return NextResponse.json(
        { success: false, message: "Login and password are required.", data: null },
        { status: 400 }
      );
    }

    const response = await loginUser({
      login: body.login,
      password: body.password,
    });

    const nextResponse = NextResponse.json(response, { status: 200 });

    nextResponse.cookies.set("nysc_access_token", response.data.tokens.access, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    nextResponse.cookies.set("nysc_refresh_token", response.data.tokens.refresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return nextResponse;
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Login failed. Please try again.",
        data: null,
      },
      { status: 401 }
    );
  }
}