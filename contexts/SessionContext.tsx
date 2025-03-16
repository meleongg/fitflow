"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface ActiveSession {
  id: string;
  workoutId: string;
  workoutName: string;
  startTime: string;
  progress?: {
    exercises: any[]; // Store sessionExercises state
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
      exercises: any[];
    };
  }) => void;
  updateSessionProgress: (exercises: any[]) => void; // Add this new function
  endSession: () => void;
}

const SessionContext = createContext<SessionContextProps | undefined>(
  undefined
);

const SESSION_STORAGE_KEY = "fitflow-active-session";

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(
    null
  );

  // Load session from storage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (savedSession) {
      setActiveSession(JSON.parse(savedSession));
    }
  }, []);

  const startSession = (session: {
    user_id: string;
    workout_id: string;
    workout_name: string;
    started_at: string;
    progress?: {
      exercises: any[];
    };
  }) => {
    // Always use current timestamp for consistency
    const currentTime = new Date().toISOString();

    const newSession: ActiveSession = {
      id: session.user_id,
      workoutId: session.workout_id,
      workoutName: session.workout_name,
      // Use current time instead of passed timestamp for consistency
      startTime: currentTime,
      progress: {
        exercises: session.progress?.exercises ?? [],
      },
    };

    // Clear any existing session first
    localStorage.removeItem(SESSION_STORAGE_KEY);

    // Set the new session
    setActiveSession(newSession);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
  };

  const updateSessionProgress = (exercises: any[]) => {
    if (!activeSession) return;

    const updatedSession = {
      ...activeSession,
      progress: {
        ...activeSession.progress,
        exercises: exercises,
      },
    };

    setActiveSession(updatedSession);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession));
  };

  const endSession = () => {
    // Clear state
    setActiveSession(null);

    // Clear all related localStorage items
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem("workout-timer-state");
    localStorage.removeItem("fitflow-active-session"); // Add this to ensure all variations are cleared

    // Force a re-render by triggering a state change in the parent components
    window.dispatchEvent(new Event("storage")); // This triggers storage event listeners
  };

  return (
    <SessionContext.Provider
      value={{ activeSession, startSession, updateSessionProgress, endSession }}
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
