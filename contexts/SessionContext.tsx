"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
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
    exercises: SessionExercise[]; // Properly type exercises
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
  getElapsedMinutes: () => number; // Add function to calculate elapsed time in minutes
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
      exercises: SessionExercise[];
    };
  }) => {
    // Use the provided started_at time to ensure consistency with the UI
    const newSession: ActiveSession = {
      id: session.user_id,
      workoutId: session.workout_id,
      workoutName: session.workout_name,
      startTime: session.started_at,
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

  const updateSessionProgress = (exercises: SessionExercise[]) => {
    if (!activeSession) return;

    const updatedSession = {
      ...activeSession,
      progress: {
        ...activeSession.progress,
        exercises: exercises, // This preserves the order of exercises
      },
    };

    setActiveSession(updatedSession);
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
      value={{
        activeSession,
        startSession,
        updateSessionProgress,
        endSession,
        getElapsedMinutes,
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
