"use client";

import { SerializableSnapshot } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatTimestampCompact } from "@/lib/formatters";

interface OrderBookChartProps {
  snapshot: SerializableSnapshot | null;
}

export function OrderBookChart({ snapshot }: OrderBookChartProps) {
  if (!snapshot) {
    return (
      <div className="w-full h-[500px] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#5FAAF7] border-t-transparent mb-3" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  const chartData = [
    ...snapshot.bids.map((level) => ({
      price: level.price.toFixed(2),
      value: -level.size,
      type: "bid" as const,
    })),
    ...snapshot.asks.map((level) => ({
      price: level.price.toFixed(2),
      value: level.size,
      type: "ask" as const,
    })),
  ].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Order Book Depth
            </h2>
            {snapshot && (
              <p className="text-xs text-gray-500 font-mono mt-0.5">
                {formatTimestampCompact(snapshot.tsEvent)}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-3 text-sm">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded text-green-700">
            <svg
              className="w-3.5 h-3.5"
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
            <span className="font-mono">{snapshot.totals.bid.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 rounded text-red-700">
            <svg
              className="w-3.5 h-3.5"
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
            <span className="font-mono">{snapshot.totals.ask.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={500}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-gray-200"
          />
          <XAxis
            type="number"
            tickFormatter={(value) => Math.abs(value).toLocaleString()}
            tick={{ fontSize: 12, fill: "currentColor" }}
            className="text-gray-600"
            stroke="currentColor"
          />
          <YAxis
            type="category"
            dataKey="price"
            width={80}
            tick={{ fontSize: 12, fill: "currentColor" }}
            className="text-gray-600 font-mono"
            stroke="currentColor"
          />
          <Tooltip
            formatter={(value: number) => [
              Math.abs(value).toLocaleString(),
              "Size",
            ]}
            labelFormatter={(label: string | number) => `Price: ${label}`}
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              border: "1px solid #e5e5e5",
              borderRadius: "0.5rem",
              color: "#1a1a1a",
              padding: "0.5rem",
            }}
            cursor={{ fill: "rgba(95, 170, 247, 0.1)" }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.type === "bid" ? "#10b981" : "#ef4444"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
