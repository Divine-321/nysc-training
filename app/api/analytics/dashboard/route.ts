import { NextResponse } from "next/server";
import { proxyApi } from "@/app/lib/api-proxy";

export async function GET() {
  try {
    const response = await proxyApi("GET", {
      path: "/api/analytics/dashboard/",
    });

    const responseBody = await response.clone().text();

    console.log("Analytics backend response:", {
      status: response.status,
      body: responseBody,
    });

    return response;
  } catch (error) {
    console.error("Analytics proxy failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "The frontend could not reach the analytics backend.",
        data: null,
      },
      { status: 500 }
    );
  }
}