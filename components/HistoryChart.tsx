"use client";

import { useEffect, useState } from "react";
import { HistoryPoint } from "@/lib/types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface HistoryChartProps {
  sessionId: string;
  currentTick: number;
  totalTicks: number;
  onSeek: (tick: number) => void;
}

export function HistoryChart({ sessionId, currentTick, onSeek }: HistoryChartProps) {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalTicks, setTotalTicks] = useState(0);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await fetch(
          `/api/history?sessionId=${sessionId}`,
        );
        const data = await response.json();
        setHistory(data.history);
        setTotalTicks(data.totalTicks);
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [sessionId]);

  // Calculate the nearest bin tick for the reference line
  const getReferenceTick = () => {
    if (history.length === 0 || totalTicks === 0) return currentTick;
    const binSize = Math.max(1, Math.ceil(totalTicks / history.length));
    const binIndex = Math.floor(currentTick / binSize);
    return binIndex * binSize;
  };

  if (loading) {
    return (
      <div className="w-full h-[500px] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#5FAAF7] border-t-transparent mb-3" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-2">
        <svg
          className="w-5 h-5 text-gray-600"
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
        <h2 className="text-lg font-semibold text-gray-900">
          Historical Depth
        </h2>
      </div>

      <ResponsiveContainer width="100%" height={500}>
        <AreaChart
          data={history}
          margin={{ top: 10, right: 30, left: 70, bottom: 30 }}
          onClick={(data) => {
            if (data && data.activeLabel) {
              const clickedTick = Number(data.activeLabel);
              onSeek(clickedTick);
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          <defs>
            <linearGradient id="bidGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="askGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-gray-200"
          />
          <XAxis
            dataKey="tick"
            tickFormatter={(value: number) => value.toLocaleString()}
            label={{
              value: "Tick",
              position: "insideBottom",
              offset: -20,
              fill: "currentColor",
            }}
            tick={{ fontSize: 11, fill: "currentColor" }}
            className="text-gray-600"
            stroke="currentColor"
          />
          <YAxis
            tickFormatter={(value: number) => value.toLocaleString()}
            label={{
              value: "Depth",
              angle: -90,
              position: "insideLeft",
              offset: 10,
              fill: "currentColor",
            }}
            tick={{ fontSize: 11, fill: "currentColor" }}
            className="text-gray-600"
            stroke="currentColor"
          />
          <Tooltip
            formatter={(value: number) => [value.toLocaleString(), ""]}
            labelFormatter={(label: string | number) =>
              `Tick: ${Number(label).toLocaleString()}`
            }
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              border: "1px solid #e5e5e5",
              borderRadius: "0.5rem",
              color: "#1a1a1a",
              padding: "0.75rem",
            }}
          />
          <Area
            type="monotone"
            dataKey="bid"
            stackId="1"
            stroke="#10b981"
            strokeWidth={1.5}
            fill="url(#bidGradient)"
            name="Bid"
          />
          <Area
            type="monotone"
            dataKey="ask"
            stackId="2"
            stroke="#ef4444"
            strokeWidth={1.5}
            fill="url(#askGradient)"
            name="Ask"
          />
          <ReferenceLine
            x={getReferenceTick()}
            stroke="#5FAAF7"
            strokeWidth={2}
            strokeDasharray="3 3"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
