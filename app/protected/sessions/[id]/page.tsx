"use client";

import BackButton from "@/components/ui/back-button";
import PageTitle from "@/components/ui/page-title";
import { createClient } from "@/utils/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@nextui-org/react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

// Fetch session data
const getSessionData = async (supabase: any, sessionId: string) => {
  const { data: session, error } = await supabase
    .from("sessions")
    .select("*, workout:workouts(*)")
    .eq("id", sessionId)
    .single();

  if (error) throw error;
  return session;
};

// Fetch session exercises
const getSessionExercises = async (supabase: any, sessionId: string) => {
  const { data: sessionExercises, error } = await supabase
    .from("session_exercises")
    .select(
      `
      *,
      exercise:exercises(*)
    `
    )
    .eq("session_id", sessionId);

  if (error) throw error;
  return sessionExercises;
};

export default function ViewSession() {
  const params = useParams();
  const sessionId = params.id as string;
  const [session, setSession] = useState<any | null>(null);
  const [sessionExercises, setSessionExercises] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [sessionData, exercisesData] = await Promise.all([
          getSessionData(supabase, sessionId),
          getSessionExercises(supabase, sessionId),
        ]);
        setSession(sessionData);
        setSessionExercises(exercisesData);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch session details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [sessionId]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!session) return <div>Session not found</div>;

  return (
    <>
      <PageTitle title={`Session for ${session.workout.name}`} />
      <BackButton url="/protected/sessions" />

      <div className="bg-creamyBeige p-4 rounded-lg mb-4">
        <h2 className="font-bold mb-2">Session Details</h2>
        <p>Date: {new Date(session.started_at).toLocaleDateString()}</p>
        <p>
          Duration:
          {" " +
            Math.round(
              (new Date(session.ended_at).getTime() -
                new Date(session.started_at).getTime()) /
                (1000 * 60)
            )}
        </p>
      </div>

      <h2 className="text-xl font-bold mb-4">Exercise Results</h2>

      <Table aria-label="Session exercises">
        <TableHeader>
          <TableColumn>EXERCISE</TableColumn>
          <TableColumn>SET NUMBER</TableColumn>
          <TableColumn>REPS</TableColumn>
          <TableColumn>WEIGHT</TableColumn>
        </TableHeader>
        <TableBody>
          {sessionExercises.map((sessionExercise) => (
            <TableRow key={sessionExercise.id}>
              <TableCell>{sessionExercise.exercise.name}</TableCell>
              <TableCell>{sessionExercise.set_number}</TableCell>
              <TableCell>{sessionExercise.reps}</TableCell>
              <TableCell>{sessionExercise.weight}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
