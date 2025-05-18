// Create a file called migrate-analytics.ts in your scripts folder or run this once
import { createClient } from "@/utils/supabase/server";

// Define the session exercise type
interface SessionExercise {
  reps: number;
  weight: number;
  exercise_id: string;
}

export async function migrateAnalyticsTable() {
  console.log("Starting analytics table migration...");

  try {
    // Fix #1: Await the client creation
    const supabase = await createClient();

    // Get current user instead of admin.listUsers()
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error("No authenticated user found");
      return;
    }

    // Process just this user
    console.log(`Processing user: ${user.id}`);

    // Get all session exercises for this user
    const { data: sessionsData, error: sessionError } = await supabase
      .from("session_exercises")
      .select(`reps, weight, exercise_id`)
      .eq("user_id", user.id);

    if (sessionError || !sessionsData) {
      console.error(`Error fetching session data:`, sessionError);
      return;
    }

    // Calculate records per exercise
    const records: Record<
      string,
      { max_weight: number; max_reps: number; max_volume: number }
    > = {};

    // Fix #3: Add type annotation for session parameter
    sessionsData.forEach((session: SessionExercise) => {
      const exerciseId = session.exercise_id;
      const weight = session.weight || 0;
      const reps = session.reps || 0;
      const volume = weight * reps;

      if (!records[exerciseId]) {
        records[exerciseId] = {
          max_weight: weight,
          max_reps: reps,
          max_volume: volume,
        };
      } else {
        if (weight > records[exerciseId].max_weight) {
          records[exerciseId].max_weight = weight;
        }
        if (reps > records[exerciseId].max_reps) {
          records[exerciseId].max_reps = reps;
        }
        if (volume > records[exerciseId].max_volume) {
          records[exerciseId].max_volume = volume;
        }
      }
    });

    // Batch update analytics records
    const updates = Object.entries(records).map(([exerciseId, record]) => ({
      user_id: user.id,
      exercise_id: exerciseId,
      max_weight: record.max_weight,
      max_reps: record.max_reps,
      max_volume: record.max_volume,
      updated_at: new Date().toISOString(),
    }));

    // Process in batches of 50
    for (let i = 0; i < updates.length; i += 50) {
      const batch = updates.slice(i, i + 50);

      const { error } = await supabase.from("analytics").upsert(batch, {
        onConflict: "user_id,exercise_id",
        ignoreDuplicates: false,
      });

      if (error) console.error("Batch update error:", error);
    }

    console.log(
      `Processed ${Object.keys(records).length} exercises for user ${user.id}`
    );
    console.log("Migration complete!");
  } catch (error) {
    console.error("Migration failed with error:", error);
  }
}
