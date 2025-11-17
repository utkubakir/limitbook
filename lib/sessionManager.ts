import { Session, Snapshot, HistoryPoint } from "./types";

class SessionManager {
  private sessions = new Map<string, Session>();

  createSession(
    snapshots: Snapshot[],
    bidDepth: number[],
    askDepth: number[],
    history: HistoryPoint[],
  ): string {
    const sessionId = crypto.randomUUID();
    const totalTicks = snapshots.length;

    this.sessions.set(sessionId, {
      snapshots,
      bidDepth,
      askDepth,
      history,
      totalTicks,
      createdAt: new Date(),
    });

    // Clean up old sessions (keep last 10)
    if (this.sessions.size > 10) {
      const sortedSessions = Array.from(this.sessions.entries()).sort(
        (a, b) => b[1].createdAt.getTime() - a[1].createdAt.getTime(),
      );
      for (let i = 10; i < sortedSessions.length; i++) {
        this.sessions.delete(sortedSessions[i][0]);
      }
    }

    return sessionId;
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  getSnapshotAt(sessionId: string, tick: number): Snapshot | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Clamp tick to valid range
    const targetTick = Math.max(0, Math.min(tick, session.totalTicks - 1));

    // Direct array lookup - no event replay needed
    return session.snapshots[targetTick];
  }
}

// Singleton instance
export const sessionManager = new SessionManager();
