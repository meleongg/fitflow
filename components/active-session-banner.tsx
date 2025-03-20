"use client";

import { useSession } from "@/contexts/SessionContext";
import { Button } from "@nextui-org/react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function ActiveSessionBanner() {
  const { activeSession, endSession } = useSession();
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [isClient, setIsClient] = useState(false);

  // Use this to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update elapsed time every minute
  useEffect(() => {
    if (!activeSession || !isClient) return;

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
  }, [activeSession, isClient]);

  // Storage event listener
  useEffect(() => {
    if (!activeSession || !isClient) return;

    const handleStorageChange = () => {
      setElapsedMinutes((prev) => prev);
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [activeSession, isClient]);

  // Show nothing during server rendering
  if (!isClient) return null;

  // Also show nothing if no active session
  if (!activeSession) return null;

  return (
    <div className="bg-amber-100 dark:bg-amber-900 border-l-4 border-amber-500 p-4 mb-4 shadow-md">
      {/* Change to flex-col on mobile, flex-row on larger screens */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <p className="font-bold dark:text-white">Active Workout Session</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {activeSession.workoutName} ({elapsedMinutes}{" "}
            {elapsedMinutes === 1 ? "minute" : "minutes"} elapsed)
          </p>
        </div>

        {/* Make buttons full width on mobile, auto width on larger screens */}
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            color="danger"
            variant="flat"
            className="w-full sm:w-auto"
            onPress={() => {
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
            className="w-full sm:w-auto dark:text-white"
          >
            Return to Session
          </Button>
        </div>
      </div>
    </div>
  );
}
