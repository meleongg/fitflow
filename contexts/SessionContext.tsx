"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface SessionExercise {
  id: string;
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  actualSets: {
    setNumber: number;
    reps: number | null;
    weight: number | null;
    completed: boolean;
  }[];
}

interface ActiveSession {
  id: string;
  workoutId: string;
  workoutName: string;
  startTime: string;
  progress?: {
    exercises: SessionExercise[];
  };
}

interface SessionContextProps {
  activeSession: ActiveSession | null;
  startSession: (workout: {
    user_id: string;
    workout_id: string;
    workout_name: string;
    started_at: string;
    progress?: {
      exercises: SessionExercise[];
    };
  }) => void;
  updateSessionProgress: (exercises: SessionExercise[]) => void;
  endSession: () => void;
  getElapsedMinutes: () => number;
  formatSessionDate: (dateString: string) => string;
}

const SessionContext = createContext<SessionContextProps | undefined>(
  undefined
);

export const SESSION_STORAGE_KEY = "fitflow-active-session";

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(
    null
  );
  const [isEnding, setIsEnding] = useState(false);
  const endTimeRef = useRef<number | null>(null);

  // Load from localStorage on mount only
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSession) {
        const parsedSession = JSON.parse(savedSession);
        if (
          parsedSession &&
          parsedSession.workoutId &&
          parsedSession.workoutName &&
          parsedSession.startTime
        ) {
          // Ensure startTime is a valid date string
          const validDate = validateStartTime(parsedSession.startTime);
          setActiveSession({
            ...parsedSession,
            startTime: validDate, // Ensure valid date format
          });
        } else {
          // Invalid data, clear it
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    } catch (e) {
      console.error("Error loading session:", e);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, []);

  // Listen for storage events to handle changes from other tabs
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorage = () => {
      const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSession) {
        try {
          const parsedSession = JSON.parse(savedSession);
          if (parsedSession && parsedSession.startTime) {
            // Ensure we have a valid date when loading from other tabs
            parsedSession.startTime = validateStartTime(
              parsedSession.startTime
            );
            setActiveSession(parsedSession);
          } else {
            setActiveSession(null);
          }
        } catch (e) {
          console.error("Error parsing saved session:", e);
          setActiveSession(null);
        }
      } else {
        setActiveSession(null);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Enhanced date validation
  const validateStartTime = (timestamp: string): string => {
    try {
      // Check if the timestamp is a valid date string
      const date = new Date(timestamp);

      // If date is Invalid Date, this will be NaN
      if (isNaN(date.getTime())) {
        console.warn("Invalid date format detected, using current time");
        return new Date().toISOString();
      }

      const startTime = date.getTime();
      const currentTime = Date.now();

      // If timestamp is in the future or more than 24 hours in the past, it's invalid
      if (startTime > currentTime || currentTime - startTime > 86400000) {
        console.warn("Invalid session timestamp detected, using current time");
        return new Date().toISOString();
      }

      // Ensure we always return in ISO format
      return date.toISOString();
    } catch (e) {
      console.error("Error validating timestamp:", e);
      return new Date().toISOString();
    }
  };

  const startSession = (session: {
    user_id: string;
    workout_id: string;
    workout_name: string;
    started_at: string;
    progress?: {
      exercises: SessionExercise[];
    };
  }) => {
    // Add a cooldown check to prevent accidental reactivation
    if (
      isEnding ||
      (endTimeRef.current && Date.now() - endTimeRef.current < 5000)
    ) {
      return; // Don't allow session start during cooldown
    }

    // Validate the timestamp
    const validatedTimestamp = validateStartTime(session.started_at);

    // Create the session object
    const newSession: ActiveSession = {
      id: session.user_id,
      workoutId: session.workout_id,
      workoutName: session.workout_name,
      startTime: validatedTimestamp,
      progress: {
        exercises: session.progress?.exercises ?? [],
      },
    };

    // Update state first
    setActiveSession(newSession);

    // Then persist to localStorage
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
  };

  const updateSessionProgress = (exercises: SessionExercise[]) => {
    if (!activeSession) return;

    const updatedSession = {
      ...activeSession,
      progress: {
        ...activeSession.progress,
        exercises: exercises, // This preserves the order of exercises
      },
    };

    // Update state first
    setActiveSession(updatedSession);

    // Then persist to localStorage
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession));
  };

  // Calculate elapsed time in minutes
  const getElapsedMinutes = (): number => {
    if (!activeSession) return 0;

    const startTime = new Date(activeSession.startTime).getTime();
    const currentTime = Date.now();

    // Convert milliseconds to minutes (rounded to 1 decimal place)
    return Math.round(((currentTime - startTime) / (1000 * 60)) * 10) / 10;
  };

  // Update the endSession function to be more thorough
  const endSession = () => {
    // Set cooldown flag
    setIsEnding(true);
    endTimeRef.current = Date.now();

    // Clear React state
    setActiveSession(null);

    if (typeof window !== "undefined") {
      try {
        // Clear localStorage
        localStorage.removeItem(SESSION_STORAGE_KEY);

        // Reset cooldown flag after 5 seconds
        setTimeout(() => {
          setIsEnding(false);
        }, 5000);
      } catch (error) {
        console.error("Error during session cleanup:", error);
      }
    }
  };

  // Add this helper to format dates consistently
  const formatSessionDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Unknown time";
      }

      // Format: "May 13, 2023 at 2:30 PM"
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch (e) {
      console.error("Error formatting date:", e);
      return "Unknown time";
    }
  };

  return (
    <SessionContext.Provider
      value={{
        activeSession,
        startSession,
        updateSessionProgress,
        endSession,
        getElapsedMinutes,
        formatSessionDate, // Add this to your context value
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};
