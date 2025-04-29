"use client";

import { useSession } from "@/contexts/SessionContext";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@nextui-org/react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function ActiveSessionBanner() {
  const { activeSession, endSession } = useSession();
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Mark as client-side rendered
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Calculate and update elapsed time
  useEffect(() => {
    if (!activeSession || !isClient) return;

    const calculateElapsed = () => {
      if (!activeSession?.startTime) return 0;

      try {
        const startTime = new Date(activeSession.startTime).getTime();
        const currentTime = Date.now();
        return Math.floor((currentTime - startTime) / 60000);
      } catch (error) {
        console.error("Error calculating elapsed time:", error);
        return 0;
      }
    };

    setElapsedMinutes(calculateElapsed());
    const interval = setInterval(() => {
      setElapsedMinutes(calculateElapsed());
    }, 30000);

    return () => clearInterval(interval);
  }, [activeSession, isClient]);

  const handleEndSession = () => {
    // Call context endSession
    endSession();

    // Close modal
    setShowEndConfirmation(false);

    // Force a full page reload to ensure clean state
    setTimeout(() => {
      window.location.href = window.location.pathname + "?ts=" + Date.now();
    }, 100);
  };

  // Don't render during SSR or if no active session
  if (!isClient || !activeSession) {
    return null;
  }

  return (
    <div className="bg-amber-100 dark:bg-amber-900 border-l-4 border-amber-500 p-4 mb-4 shadow-md">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <p className="font-bold dark:text-white">Active Workout Session</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {activeSession?.workoutName} ({elapsedMinutes}{" "}
            {elapsedMinutes === 1 ? "minute" : "minutes"} elapsed)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            color="danger"
            variant="flat"
            className="w-full sm:w-auto"
            onPress={() => setShowEndConfirmation(true)}
          >
            End Session
          </Button>
          <Button
            as={Link}
            href={
              activeSession?.workoutId
                ? `/protected/workouts/${activeSession.workoutId}/session`
                : "/protected/workouts"
            }
            color="primary"
            size="sm"
            className="w-full sm:w-auto dark:text-white"
          >
            Return to Session
          </Button>
        </div>
      </div>

      {/* Add a manual debug reset button in development */}
      {process.env.NODE_ENV === "development" && (
        <Button
          size="sm"
          className="mt-2 text-xs"
          color="danger"
          variant="ghost"
          onPress={() => {
            localStorage.removeItem("fitflow-active-session");
            endSession();
            window.location.reload();
          }}
        >
          Force Reset (Debug)
        </Button>
      )}

      <Modal
        isOpen={showEndConfirmation}
        onClose={() => setShowEndConfirmation(false)}
        placement="center"
        size="sm"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                End Session?
              </ModalHeader>
              <ModalBody>
                <p>Are you sure you want to end this workout session?</p>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="default"
                  variant="light"
                  onPress={() => setShowEndConfirmation(false)}
                >
                  Cancel
                </Button>
                <Button color="danger" onPress={handleEndSession}>
                  End Session
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
