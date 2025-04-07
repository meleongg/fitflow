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
  // Get session from context
  const { activeSession, endSession } = useSession();

  // Local state
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Check actual localStorage state directly
  const verifyActiveSession = () => {
    if (typeof window === "undefined") return false;

    try {
      const rawData = localStorage.getItem("fitflow-active-session");

      // If no data in localStorage, no active session
      if (!rawData) return false;

      // Try to parse the data
      const sessionData = JSON.parse(rawData);

      // Verify the session data has required fields
      return !!(
        sessionData &&
        sessionData.workoutId &&
        sessionData.workoutName &&
        sessionData.startTime
      );
    } catch (e) {
      console.error("Error verifying active session:", e);
      // If there's an error, clean up localStorage
      localStorage.removeItem("fitflow-active-session");
      return false;
    }
  };

  // Set client-side flag and do initial verification
  useEffect(() => {
    setIsClient(true);

    // Initial verification of localStorage data
    const hasValidSession = verifyActiveSession();
    setShouldRender(hasValidSession);

    // Listen for storage events from other components/tabs
    const handleStorageChange = () => {
      const hasSession = verifyActiveSession();
      setShouldRender(hasSession);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("session-ended", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("session-ended", handleStorageChange);
    };
  }, []);

  // Re-verify whenever activeSession context changes
  useEffect(() => {
    if (isClient) {
      const hasValidSession = verifyActiveSession();

      // If context says there's a session but localStorage says no, don't render
      if (activeSession && !hasValidSession) {
        console.log(
          "Context has session but localStorage doesn't - skipping render"
        );
        setShouldRender(false);
      } else if (!activeSession && hasValidSession) {
        // If localStorage has session but context doesn't, clean up localStorage
        console.log(
          "Inconsistency: localStorage has session but context doesn't"
        );
        localStorage.removeItem("fitflow-active-session");
        setShouldRender(false);
      } else {
        setShouldRender(!!activeSession && hasValidSession);
      }
    }
  }, [activeSession, isClient]);

  // Calculate and update elapsed time
  useEffect(() => {
    if (!shouldRender || !activeSession || !isClient) {
      return;
    }

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
  }, [activeSession, isClient, shouldRender]);

  // Enhanced endSession to ensure complete cleanup
  const handleEndSession = () => {
    console.log("Ending session via banner");

    // Use the context's endSession
    endSession();

    // Extra cleanup for redundancy
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("fitflow-active-session");
        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        console.error("Error during cleanup:", e);
      }
    }

    // Force our component to update
    setShouldRender(false);
    setShowEndConfirmation(false);
  };

  // Don't render during SSR
  if (!isClient) return null;

  // Don't render if we've determined we shouldn't
  if (!shouldRender) return null;

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
            setShouldRender(false);
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
