import { createClient } from "@/utils/supabase/client";
import { db } from "./indexedDB";

export const syncService = {
  async syncUnsyncedSessions() {
    const supabase = createClient();
    const unsyncedSessions = await db.getUnsyncedSessions();

    for (const session of unsyncedSessions) {
      try {
        const { data, error } = await supabase
          .from("sessions")
          .insert({
            workout_id: session.workout_id,
            started_at: session.started_at,
            ended_at: session.ended_at,
          })
          .select()
          .single();

        if (error) throw error;

        // Insert exercise sets
        await supabase.from("session_exercises").insert(
          session.exercises.flatMap((exercise: any) =>
            exercise.sets.map((set: any, index: number) => ({
              session_id: data.id,
              exercise_id: exercise.exercise_id,
              set_number: index + 1,
              reps: set.reps,
              weight: set.weight,
            }))
          )
        );

        // Mark as synced in IndexedDB
        const dbInstance = await db.init();
        await dbInstance.put("workoutSessions", {
          ...session,
          synced: true,
        });
      } catch (error) {
        console.error("Sync failed:", error);
      }
    }
  },
};
