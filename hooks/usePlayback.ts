import { useState, useEffect, useRef } from "react";
import { SerializableSnapshot } from "@/lib/types";

export function usePlayback(sessionId: string, totalTicks: number) {
  const [currentTick, setCurrentTick] = useState(0);
  const [snapshot, setSnapshot] = useState<SerializableSnapshot | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // 1x speed by default
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch snapshot whenever currentTick changes
  useEffect(() => {
    async function fetchSnapshot() {
      try {
        const response = await fetch(
          `/api/snapshot?sessionId=${sessionId}&tick=${currentTick}`,
        );
        if (response.ok) {
          const data = await response.json();
          setSnapshot(data);
        }
      } catch (err) {
        console.error("Failed to fetch snapshot:", err);
      }
    }

    fetchSnapshot();
  }, [sessionId, currentTick]);

  // Playback interval
  useEffect(() => {
    if (isPlaying) {
      // Base interval is 100ms (10 ticks/second at 1x speed)
      // Speed multiplier: 0.25x = 400ms, 0.5x = 200ms, 1x = 100ms, 2x = 50ms, etc.
      const interval = 100 / speed;

      intervalRef.current = setInterval(() => {
        setCurrentTick((prev) => {
          const next = prev + 1;
          if (next >= totalTicks) {
            setIsPlaying(false);
            return prev;
          }
          return next;
        });
      }, interval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, totalTicks, speed]);

  const play = () => {
    if (currentTick >= totalTicks - 1) {
      setCurrentTick(0);
    }
    setIsPlaying(true);
  };

  const stop = () => {
    setIsPlaying(false);
  };

  const jump = (delta: number) => {
    setIsPlaying(false);
    setCurrentTick((prev) => {
      const next = prev + delta;
      return Math.max(0, Math.min(next, totalTicks - 1));
    });
  };

  const seek = (tick: number) => {
    setIsPlaying(false);
    setCurrentTick(Math.max(0, Math.min(tick, totalTicks - 1)));
  };

  return {
    currentTick,
    snapshot,
    isPlaying,
    speed,
    play,
    stop,
    jump,
    seek,
    setSpeed,
  };
}
