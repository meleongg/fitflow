"use client";

import { useEffect, useState } from "react";

export const TIMER_STORAGE_KEY = "workout-timer-state";

interface TimerState {
  startTime: number;
  isRunning: boolean;
  elapsed: number;
}

export default function Timer() {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // Load persisted state
  useEffect(() => {
    const saved = localStorage.getItem(TIMER_STORAGE_KEY);
    if (saved) {
      const state: TimerState = JSON.parse(saved);
      if (state.isRunning) {
        const now = Date.now();
        const newElapsed = state.elapsed + (now - state.startTime);
        setTime(newElapsed);
        setIsRunning(true);
      } else {
        setTime(state.elapsed);
      }
    }
  }, []);

  // Handle timer updates
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning) {
      // Save state when timer starts/resumes
      localStorage.setItem(
        TIMER_STORAGE_KEY,
        JSON.stringify({
          startTime: Date.now(),
          isRunning: true,
          elapsed: time,
        })
      );

      interval = setInterval(() => {
        setTime((t) => {
          const newTime = t + 1000;
          // Update storage with new time
          localStorage.setItem(
            TIMER_STORAGE_KEY,
            JSON.stringify({
              startTime: Date.now(),
              isRunning: true,
              elapsed: newTime,
            })
          );
          return newTime;
        });
      }, 1000);
    } else {
      // Save stopped state
      localStorage.setItem(
        TIMER_STORAGE_KEY,
        JSON.stringify({
          startTime: Date.now(),
          isRunning: false,
          elapsed: time,
        })
      );
    }

    return () => clearInterval(interval);
  }, [isRunning]);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isRunning) {
        const saved = localStorage.getItem(TIMER_STORAGE_KEY);
        if (saved) {
          const state: TimerState = JSON.parse(saved);
          const now = Date.now();
          const newElapsed = state.elapsed + (now - state.startTime);
          setTime(newElapsed);
          // Update storage with new reference time
          localStorage.setItem(
            TIMER_STORAGE_KEY,
            JSON.stringify({
              startTime: now,
              isRunning: true,
              elapsed: newElapsed,
            })
          );
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isRunning]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 1000 / 60) % 60);
    const hours = Math.floor(ms / 1000 / 60 / 60);

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="text-center">
      <div className="text-4xl font-mono mb-4">{formatTime(time)}</div>
      <div className="space-x-2">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="bg-primary text-white px-4 py-2 rounded"
        >
          {isRunning ? "Pause" : "Start"}
        </button>
        <button
          onClick={() => {
            setTime(0);
            setIsRunning(false);
            localStorage.setItem(
              TIMER_STORAGE_KEY,
              JSON.stringify({
                startTime: Date.now(),
                isRunning: false,
                elapsed: 0,
              })
            );
          }}
          className="bg-secondary text-white px-4 py-2 rounded"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
