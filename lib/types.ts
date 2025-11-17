export type Side = "bid" | "ask";

// Core snapshot data structures
export interface BookLevel {
  price: number;
  size: number;
}

export interface Snapshot {
  tsRecv: string;
  tsEvent: string;
  bids: BookLevel[];
  asks: BookLevel[];
}

export interface HistoryPoint {
  tick: number;
  bid: number;
  ask: number;
}

export interface Session {
  snapshots: Snapshot[];
  bidDepth: number[];
  askDepth: number[];
  history: HistoryPoint[];
  totalTicks: number;
  createdAt: Date;
}

// Wire format for API responses
export interface SerializableSnapshot {
  tick: number;
  tsRecv: string;
  tsEvent: string;
  bids: Array<{ price: number; size: number }>;
  asks: Array<{ price: number; size: number }>;
  totals: { bid: number; ask: number };
}
