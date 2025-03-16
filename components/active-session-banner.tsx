"use client";

import { useSession } from "@/contexts/SessionContext";
import { Button } from "@nextui-org/react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function ActiveSessionBanner() {
  const { activeSession, endSession } = useSession();
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  // Update elapsed time every minute
  useEffect(() => {
    if (!activeSession) return;

    // Calculate initial elapsed time
    const calculateElapsed = () => {
      try {
        // Get the timestamp directly from activeSession
        if (!activeSession) return 0;

        let startTimeMs;

        // Handle different timestamp formats
        if (typeof activeSession.startTime === "number") {
          startTimeMs = activeSession.startTime;
        } else if (typeof activeSession.startTime === "string") {
          // Try to parse the string date
          startTimeMs = new Date(activeSession.startTime).getTime();

          // If parsing failed, use current time (fallback to now)
          if (isNaN(startTimeMs)) {
            console.error("Invalid date format:", activeSession.startTime);
            // Use a sensible fallback - session just started
            startTimeMs = Date.now();
          }
        } else {
          console.error("Missing or invalid startTime in session");
          return 0;
        }

        const currentTime = Date.now();
        const elapsedMs = Math.max(0, currentTime - startTimeMs);
        return Math.floor(elapsedMs / 60000);
      } catch (error) {
        console.error("Error calculating elapsed time:", error);
        return 0;
      }
    };

    setElapsedMinutes(calculateElapsed());

    // Update every 5 seconds for more responsive UI
    const interval = setInterval(() => {
      setElapsedMinutes(calculateElapsed());
    }, 5000);

    return () => clearInterval(interval);
  }, [activeSession]);

  useEffect(() => {
    // Initial check
    if (!activeSession) return;

    // Listen for storage changes
    const handleStorageChange = () => {
      // Force re-render when storage changes
      setElapsedMinutes((prev) => prev); // Dummy state update to force re-render
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [activeSession]);

  if (!activeSession) return null;

  return (
    <div className="bg-amber-100 dark:bg-amber-900 border-l-4 border-amber-500 p-4 mb-4 shadow-md">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-bold dark:text-white">Active Workout Session</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {activeSession.workoutName} ({elapsedMinutes}{" "}
            {elapsedMinutes === 1 ? "minute" : "minutes"} elapsed)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            color="danger"
            variant="flat"
            onClick={() => {
              if (
                confirm("Are you sure you want to end this workout session?")
              ) {
                endSession();
              }
            }}
          >
            End Session
          </Button>
          <Button
            as={Link}
            href={`/protected/workouts/${activeSession.workoutId}/session`}
            color="primary"
            size="sm"
            className="dark:text-white"
          >
            Return to Session
          </Button>
        </div>
      </div>
    </div>
  );
}
