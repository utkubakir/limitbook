import { NextRequest, NextResponse } from "next/server";
import { sessionManager } from "@/lib/sessionManager";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 },
      );
    }

    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 },
      );
    }

    // Return pre-computed history (1000 bins computed during CSV parsing)
    return NextResponse.json({
      history: session.history,
      totalTicks: session.totalTicks,
    });
  } catch (err) {
    console.error("History error:", err);
    return NextResponse.json(
      { error: "Failed to get history" },
      { status: 500 },
    );
  }
}
