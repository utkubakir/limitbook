"use client";

import { useState } from "react";
import { UploadForm } from "@/components/UploadForm";
import { AppShell } from "@/components/AppShell";
import { usePlayback } from "@/hooks/usePlayback";

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [totalTicks, setTotalTicks] = useState<number>(0);

  const playback = usePlayback(sessionId || "", totalTicks);

  const handleUploadComplete = (newSessionId: string, newTotalTicks: number) => {
    setSessionId(newSessionId);
    setTotalTicks(newTotalTicks);
  };

  const handleReset = () => {
    setSessionId(null);
    setTotalTicks(0);
  };

  if (!sessionId) {
    return <UploadForm onUploadComplete={handleUploadComplete} />;
  }

  return (
    <AppShell
      sessionId={sessionId}
      totalTicks={totalTicks}
      currentTick={playback.currentTick}
      snapshot={playback.snapshot}
      isPlaying={playback.isPlaying}
      speed={playback.speed}
      onPlay={playback.play}
      onStop={playback.stop}
      onJump={playback.jump}
      onSeek={playback.seek}
      onSpeedChange={playback.setSpeed}
      onReset={handleReset}
    />
  );
}
