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
      const startTime = new Date(activeSession.startTime);
      const currentTime = new Date();
      return Math.floor((currentTime.getTime() - startTime.getTime()) / 60000);
    };

    setElapsedMinutes(calculateElapsed());

    // Update every minute
    const interval = setInterval(() => {
      setElapsedMinutes(calculateElapsed());
    }, 60000);

    return () => clearInterval(interval);
  }, [activeSession]);

  if (!activeSession) return null;

  return (
    <div className="bg-amber-100 border-l-4 border-amber-500 p-4 mb-4 shadow-md">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-bold">Active Workout Session</p>
          <p className="text-sm text-gray-600">
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
          >
            Return to Session
          </Button>
        </div>
      </div>
    </div>
  );
}
