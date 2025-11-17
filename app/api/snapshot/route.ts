import { NextRequest, NextResponse } from "next/server";
import { sessionManager } from "@/lib/sessionManager";
import { SerializableSnapshot } from "@/lib/types";

const MAX_DEPTH_LEVELS = 25;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get("sessionId");
    const tickParam = searchParams.get("tick");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 },
      );
    }

    if (tickParam === null) {
      return NextResponse.json(
        { error: "tick is required" },
        { status: 400 },
      );
    }

    const tick = parseInt(tickParam, 10);
    if (isNaN(tick) || tick < 0) {
      return NextResponse.json(
        { error: "tick must be a non-negative integer" },
        { status: 400 },
      );
    }

    const snapshot = sessionManager.getSnapshotAt(sessionId, tick);

    if (!snapshot) {
      return NextResponse.json(
        { error: "Session not found or invalid tick" },
        { status: 404 },
      );
    }

    // Convert to serializable format with depth limit
    const serializable: SerializableSnapshot = {
      tick,
      tsRecv: snapshot.tsRecv,
      tsEvent: snapshot.tsEvent,
      bids: snapshot.bids.slice(0, MAX_DEPTH_LEVELS).map((level) => ({
        price: level.price,
        size: level.size,
      })),
      asks: snapshot.asks.slice(0, MAX_DEPTH_LEVELS).map((level) => ({
        price: level.price,
        size: level.size,
      })),
      totals: {
        bid: snapshot.bids.reduce((sum, level) => sum + level.size, 0),
        ask: snapshot.asks.reduce((sum, level) => sum + level.size, 0),
      },
    };

    return NextResponse.json(serializable);
  } catch (err) {
    console.error("Snapshot error:", err);
    return NextResponse.json(
      { error: "Failed to get snapshot" },
      { status: 500 },
    );
  }
}
