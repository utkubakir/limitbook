/**
 * Format timestamp string for display
 * Handles various timestamp formats (Unix ms, ISO string, etc.)
 */
export function formatTimestamp(ts: string | number): string {
  try {
    const date = typeof ts === "string" ? new Date(ts) : new Date(ts);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  } catch {
    return String(ts);
  }
}

/**
 * Format timestamp in compact form (for limited space)
 */
export function formatTimestampCompact(ts: string | number): string {
  try {
    const date = typeof ts === "string" ? new Date(ts) : new Date(ts);
    return date.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
      hour12: false,
    });
  } catch {
    return String(ts);
  }
}

/**
 * Calculate latency between receive and event timestamps (in microseconds)
 */
export function calculateLatency(tsRecv: string, tsEvent: string): number {
  try {
    const recv = new Date(tsRecv).getTime();
    const event = new Date(tsEvent).getTime();
    return Math.abs(recv - event);
  } catch {
    return 0;
  }
}

/**
 * Format latency for display
 */
export function formatLatency(latencyMs: number): string {
  if (latencyMs < 1) {
    return `${(latencyMs * 1000).toFixed(0)}μs`;
  } else if (latencyMs < 1000) {
    return `${latencyMs.toFixed(2)}ms`;
  } else {
    return `${(latencyMs / 1000).toFixed(2)}s`;
  }
}
