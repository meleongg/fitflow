import { openDB } from "idb";

const DB_NAME = "fitflow-offline";
const DB_VERSION = 1;

// TODO: may possibly need to store user_id; unless workout_id -> user_id
export interface OfflineWorkoutSession {
  id?: number;
  workout_id: string;
  started_at: string;
  ended_at: string;
  exercises: Array<{
    exercise_id: string;
    sets: Array<{
      reps: number;
      weight: number;
      completed: boolean;
    }>;
  }>;
  synced: boolean;
}

export const db = {
  async init() {
    return openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Store for offline sessions
        if (!db.objectStoreNames.contains("workoutSessions")) {
          const store = db.createObjectStore("workoutSessions", {
            keyPath: "id",
            autoIncrement: true,
          });
          store.createIndex("synced", "synced");
        }
      },
    });
  },

  // the Omit<OfflineWorkoutSession, "id" | "synced"> type utility is used to create a type that excludes the id and synced fields (makes them optional)
  async saveWorkoutSession(
    session: Omit<OfflineWorkoutSession, "id" | "synced">
  ) {
    const db = await this.init();
    return db.add("workoutSessions", {
      ...session,
      synced: false,
    });
  },

  async getUnsyncedSessions() {
    const db = await this.init();
    return db.getAllFromIndex("workoutSessions", "synced", 0);
  },
};
