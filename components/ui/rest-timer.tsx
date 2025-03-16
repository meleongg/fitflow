"use client";

import { createClient } from "@/utils/supabase/client";
import { Button } from "@nextui-org/react";
import { Bell, Pause, Play, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";

interface RestTimerProps {
  defaultSeconds?: number;
  onComplete?: () => void;
}

export default function RestTimer({
  defaultSeconds,
  onComplete,
}: RestTimerProps) {
  const [seconds, setSeconds] = useState(defaultSeconds || 90);
  const [isRunning, setIsRunning] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const supabase = createClient();

  // Check if notifications are supported and permitted
  useEffect(() => {
    const checkNotificationPermission = async () => {
      if (!("Notification" in window)) {
        console.log("This browser does not support notifications");
        return;
      }

      if (Notification.permission === "granted") {
        setNotificationsEnabled(true);
      }
    };

    checkNotificationPermission();
  }, []);

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support notifications");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === "granted");

      if (permission === "granted") {
        // Show test notification
        new Notification("FitFlow Timer", {
          body: "Notifications enabled for workout timer",
          icon: "/icons/icon-192x192.png", // Use your app icon
        });

        // Register service worker if not already done
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker
            .register("/sw.js")
            .then((registration) => console.log("ServiceWorker registered"))
            .catch((err) =>
              console.error("ServiceWorker registration failed:", err)
            );
        }
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
    }
  };

  // Send notification when timer completes
  const sendNotification = () => {
    if (!notificationsEnabled) return;

    // Try to use service worker for notification
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification("Rest Time Complete!", {
          body: "Time to start your next set!",
          icon: "/icons/icon-192x192.png",
          // vibrate: [200, 100, 200],
          tag: "rest-timer",
          // actions: [{ action: "start-next", title: "Start Next Set" }],
          requireInteraction: true,
        });
      });
    } else {
      // Fallback to regular notification
      new Notification("Rest Time Complete!", {
        body: "Time to start your next set!",
        icon: "/icons/icon-192x192.png",
      });
    }
  };

  // Fetch user preferences from Supabase
  useEffect(() => {
    const fetchUserPreferences = async () => {
      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch user preferences
        const { data: preferences, error } = await supabase
          .from("user_preferences")
          .select("default_rest_timer")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching rest timer preference:", error);
          return;
        }

        if (preferences && preferences.default_rest_timer) {
          // Only update if not explicitly provided via props
          if (!defaultSeconds) {
            setSeconds(preferences.default_rest_timer);
          }
        }
      } catch (err) {
        console.error("Error in preferences fetch:", err);
      }
    };

    fetchUserPreferences();
  }, [supabase, defaultSeconds]);

  useEffect(() => {
    // Reset timer if defaultSeconds changes
    if (defaultSeconds) {
      setSeconds(defaultSeconds);
    }
  }, [defaultSeconds]);

  // Fix the timer interval implementation
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsRunning(false);

            // Send notification
            sendNotification();

            // Schedule the callback separately to avoid render phase updates
            setTimeout(() => {
              if (onComplete) onComplete();
            }, 0);

            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, seconds, notificationsEnabled]);

  const resetTimer = () => {
    // Reset to either provided defaultSeconds or the fetched user preference
    setSeconds(defaultSeconds || seconds);
    setIsRunning(false);
  };

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 right-4 p-4 bg-background border border-border rounded-lg shadow-lg z-50 w-48 dark:bg-gray-800 animate-fade-in">
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-between w-full mb-1">
          <h3 className="text-md font-semibold">Rest Timer</h3>
          {!notificationsEnabled && (
            <Button
              size="sm"
              isIconOnly
              color="primary"
              variant="flat"
              onPress={requestNotificationPermission}
              title="Enable notifications"
            >
              <Bell size={16} />
            </Button>
          )}
        </div>
        <div className="text-2xl font-bold mb-2">
          {minutes}:{remainingSeconds.toString().padStart(2, "0")}
        </div>
        <div className="flex space-x-2">
          <Button
            size="sm"
            isIconOnly
            color={isRunning ? "warning" : "success"}
            onPress={() => setIsRunning(!isRunning)}
            className="dark:text-white"
          >
            {isRunning ? <Pause size={18} /> : <Play size={18} />}
          </Button>
          <Button
            size="sm"
            isIconOnly
            color="default"
            onPress={resetTimer}
            className="dark:text-foreground"
          >
            <RotateCcw size={18} />
          </Button>
          <Button
            size="sm"
            isIconOnly
            color="danger"
            onPress={() => setIsVisible(false)}
            className="dark:text-white"
          >
            <X size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Also update the hook
export function useRestTimer() {
  const [showTimer, setShowTimer] = useState(false);
  const [timerDuration, setTimerDuration] = useState(90);
  const supabase = createClient();

  useEffect(() => {
    const fetchUserPreferences = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: preferences } = await supabase
          .from("user_preferences")
          .select("default_rest_timer")
          .eq("user_id", user.id)
          .single();

        if (preferences?.default_rest_timer) {
          setTimerDuration(preferences.default_rest_timer);
        }
      } catch (err) {
        console.error("Error in preferences fetch:", err);
      }
    };

    fetchUserPreferences();
  }, [supabase]);

  const startRest = (duration?: number) => {
    if (duration) setTimerDuration(duration);
    setShowTimer(true);
  };

  return {
    showTimer,
    startRest,
    timerDuration,
    hideTimer: () => setShowTimer(false),
  };
}
