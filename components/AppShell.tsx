"use client";

import { OrderBookChart } from "./OrderBookChart";
import { HistoryChart } from "./HistoryChart";
import { PlaybackControls } from "./PlaybackControls";
import { SerializableSnapshot } from "@/lib/types";
import { formatTimestampCompact } from "@/lib/formatters";

interface AppShellProps {
  sessionId: string;
  totalTicks: number;
  currentTick: number;
  snapshot: SerializableSnapshot | null;
  isPlaying: boolean;
  speed: number;
  onPlay: () => void;
  onStop: () => void;
  onJump: (delta: number) => void;
  onSeek: (tick: number) => void;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
}

export function AppShell({
  sessionId,
  totalTicks,
  currentTick,
  snapshot,
  isPlaying,
  speed,
  onPlay,
  onStop,
  onJump,
  onSeek,
  onSpeedChange,
  onReset,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="w-6 h-6 text-[#5FAAF7]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                />
              </svg>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Order Book Visualizer
                </h1>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  Session: {sessionId.substring(0, 8)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onReset}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                <span>New Upload</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <PlaybackControls
          currentTick={currentTick}
          totalTicks={totalTicks}
          snapshot={snapshot}
          isPlaying={isPlaying}
          speed={speed}
          onPlay={onPlay}
          onStop={onStop}
          onJump={onJump}
          onSeek={onSeek}
          onSpeedChange={onSpeedChange}
        />

        {snapshot && (
          <div className="grid grid-cols-4 gap-4">
            <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg
                  className="w-5 h-5 text-green-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-green-600 font-medium">
                  Total Bid
                </p>
                <p className="text-lg font-semibold text-green-700 font-mono">
                  {snapshot.totals.bid.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg
                  className="w-5 h-5 text-red-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-red-600 font-medium">
                  Total Ask
                </p>
                <p className="text-lg font-semibold text-red-700 font-mono">
                  {snapshot.totals.ask.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="p-2 bg-gray-100 rounded-lg">
                <svg
                  className="w-5 h-5 text-gray-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium">
                  Price Levels
                </p>
                <p className="text-lg font-semibold text-gray-700 font-mono">
                  {(snapshot.bids.length + snapshot.asks.length).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg
                  className="w-5 h-5 text-blue-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium">
                  Event Time
                </p>
                <p className="text-sm font-semibold text-blue-700 font-mono">
                  {formatTimestampCompact(snapshot.tsEvent)}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <OrderBookChart snapshot={snapshot} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <HistoryChart
              sessionId={sessionId}
              currentTick={currentTick}
              totalTicks={totalTicks}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
