"use client";

import { useSession } from "@/contexts/SessionContext";
import { useEffect, useState } from "react";

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);

  // Only display hours and minutes
  return hours > 0
    ? `${hours}:${mins.toString().padStart(2, "0")}`
    : `${mins} min`;
}

export default function SessionDuration() {
  const { getElapsedMinutes } = useSession();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    // Update elapsed time every second
    const interval = setInterval(() => {
      setElapsed(getElapsedMinutes());
    }, 1000);

    return () => clearInterval(interval);
  }, [getElapsedMinutes]);

  return (
    <div className="font-mono font-semibold tabular-nums">
      {formatDuration(elapsed)}
    </div>
  );
}
