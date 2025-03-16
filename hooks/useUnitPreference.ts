import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

export function useUnitPreference() {
  const [useMetric, setUseMetric] = useState(true); // Default to metric
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
          .select("use_metric")
          .eq("user_id", user.id)
          .single();

        if (data) {
          setUseMetric(data.use_metric);
        }
      }

      setIsLoading(false);
    };

    fetchPreferences();
  }, []);

  return { useMetric, isLoading };
}
