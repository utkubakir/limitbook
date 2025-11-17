"use client";

import { useState } from "react";
import { SerializableSnapshot } from "@/lib/types";
import { formatTimestampCompact, calculateLatency, formatLatency } from "@/lib/formatters";

interface PlaybackControlsProps {
  currentTick: number;
  totalTicks: number;
  snapshot: SerializableSnapshot | null;
  isPlaying: boolean;
  speed: number;
  onPlay: () => void;
  onStop: () => void;
  onJump: (delta: number) => void;
  onSeek: (tick: number) => void;
  onSpeedChange: (speed: number) => void;
}

export function PlaybackControls({
  currentTick,
  totalTicks,
  snapshot,
  isPlaying,
  speed,
  onPlay,
  onStop,
  onJump,
  onSeek,
  onSpeedChange,
}: PlaybackControlsProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [isHoveringProgress, setIsHoveringProgress] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(0);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tick = parseInt(e.target.value, 10);
    onSeek(tick);
  };

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setHoverPosition(Math.max(0, Math.min(100, percentage)));
  };

  const progress = totalTicks > 0 ? (currentTick / totalTicks) * 100 : 0;
  const hoverTick = Math.round((hoverPosition / 100) * totalTicks);

  const speedOptions = [0.25, 0.5, 1, 2, 5, 10];

  const formatSpeed = (s: number) => {
    if (s === 1) return "1x";
    if (s < 1) return `${s}x`;
    return `${s}x`;
  };

  return (
    <div className="w-full bg-white rounded-xl border border-gray-200 p-6 relative">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500 mb-1">Current Tick</p>
          <p className="text-2xl font-semibold font-mono text-gray-900">
            {currentTick.toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 mb-1">Total Ticks</p>
          <p className="text-lg font-medium font-mono text-gray-600">
            {totalTicks.toLocaleString()}
          </p>
        </div>
      </div>

      {snapshot && (
        <div className="flex items-center justify-between text-xs text-gray-600 mb-3 pb-3 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div>
              <span className="font-medium text-gray-500">Event:</span>{" "}
              <span className="font-mono">{formatTimestampCompact(snapshot.tsEvent)}</span>
            </div>
            <div>
              <span className="font-medium text-gray-500">Recv:</span>{" "}
              <span className="font-mono">{formatTimestampCompact(snapshot.tsRecv)}</span>
            </div>
          </div>
          <div>
            <span className="font-medium text-gray-500">Latency:</span>{" "}
            <span className="font-mono text-blue-600">
              {formatLatency(calculateLatency(snapshot.tsRecv, snapshot.tsEvent))}
            </span>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>Progress</span>
          <span>{progress.toFixed(1)}%</span>
        </div>
        <div
          className="relative group cursor-pointer"
          onMouseEnter={() => setIsHoveringProgress(true)}
          onMouseLeave={() => setIsHoveringProgress(false)}
          onMouseMove={handleProgressHover}
        >
          {/* Hover tooltip */}
          {isHoveringProgress && (
            <div
              className="absolute bottom-full mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap pointer-events-none"
              style={{ left: `${hoverPosition}%`, transform: 'translateX(-50%)' }}
            >
              Tick: {hoverTick.toLocaleString()}
            </div>
          )}

          {/* Progress bar track */}
          <div
            className={`relative bg-gray-200 rounded-full transition-all ${
              isHoveringProgress ? 'h-3' : 'h-2'
            }`}
          >
            {/* Hover preview (shows where you'll seek to) */}
            {isHoveringProgress && (
              <div
                className="absolute inset-y-0 left-0 bg-gray-300 rounded-full"
                style={{ width: `${hoverPosition}%` }}
              />
            )}

            {/* Current progress */}
            <div
              className="absolute inset-y-0 left-0 bg-[#5FAAF7] rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />

            {/* Invisible range input for interaction */}
            <input
              type="range"
              min="0"
              max={totalTicks - 1}
              value={currentTick}
              onChange={handleSliderChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Settings"
        >
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
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>

        <div className="flex items-center justify-center gap-3 flex-1">
          <button
            onClick={() => onJump(-100)}
            disabled={currentTick === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Reverse 100 ticks"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"
              />
            </svg>
            <span>100</span>
          </button>

          {!isPlaying ? (
            <button
              onClick={onPlay}
              disabled={currentTick >= totalTicks - 1}
              className="flex items-center gap-2 px-8 py-2 bg-[#5FAAF7] hover:bg-[#4A9AE6] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>Play</span>
            </button>
          ) : (
            <button
              onClick={onStop}
              className="flex items-center gap-2 px-8 py-2 bg-[#5FAAF7] hover:bg-[#4A9AE6] text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
              <span>Pause</span>
            </button>
          )}

          <button
            onClick={() => onJump(100)}
            disabled={currentTick >= totalTicks - 1}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Advance 100 ticks"
          >
            <span>100</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"
              />
            </svg>
          </button>
        </div>

        <div className="w-10" />
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowSettings(false)} />

          {/* Settings Panel */}
          <div className="absolute left-0 top-full mt-2 w-96 bg-white rounded-xl border border-gray-200 shadow-xl z-50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Playback Speed */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">Playback Speed</p>
                <p className="text-sm font-semibold text-[#5FAAF7]">{formatSpeed(speed)}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {speedOptions.map((speedOption) => (
                  <button
                    key={speedOption}
                    onClick={() => onSpeedChange(speedOption)}
                    className={`py-2.5 px-3 text-sm font-medium rounded-lg transition-colors ${
                      speed === speedOption
                        ? "bg-[#5FAAF7] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {formatSpeed(speedOption)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
