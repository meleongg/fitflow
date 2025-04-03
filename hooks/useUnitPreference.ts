import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

export function useUnitPreference() {
  const [useMetric, setUseMetric] = useState(true);
  const [defaultRestTimer, setDefaultRestTimer] = useState(60); // Add this
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchPreferences = async () => {
      setIsLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from("user_preferences")
          .select("use_metric, default_rest_timer") // Get both preferences
          .eq("user_id", user.id)
          .single();

        if (data) {
          setUseMetric(data.use_metric);
          // Use the rest timer or default to 60 seconds
          setDefaultRestTimer(data.default_rest_timer || 60);
        }
      }

      setIsLoading(false);
    };

    fetchPreferences();
  }, []);

  return { useMetric, defaultRestTimer, isLoading }; // Return the new value
}
