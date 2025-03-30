"use client";

import BackButton from "@/components/ui/back-button";
import PageTitle from "@/components/ui/page-title";
import { useUnitPreference } from "@/hooks/useUnitPreference";
import { createClient } from "@/utils/supabase/client";
import { displayWeight } from "@/utils/units";
import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@nextui-org/react";
import { Calendar, Clock, Dumbbell } from "lucide-react";
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

// Fetch session exercises with proper category information
const getSessionExercises = async (supabase: any, sessionId: string) => {
  const { data: sessionExercises, error } = await supabase
    .from("session_exercises")
    .select(
      `
      *,
      exercise:exercises(
        *,
        category:categories(*)
      )
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

  // Add unit preference hook
  const { useMetric, isLoading: isLoadingUnits } = useUnitPreference();

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

  if (isLoading || isLoadingUnits) {
    return (
      <div className="p-4 flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }
  if (error) return <div className="text-red-500">{error}</div>;
  if (!session) return <div>Session not found</div>;

  // Calculate session duration in minutes and seconds
  const durationMs =
    new Date(session.ended_at).getTime() -
    new Date(session.started_at).getTime();
  const durationMinutes = Math.floor(durationMs / (1000 * 60));
  const durationSeconds = Math.floor((durationMs % (1000 * 60)) / 1000);

  // Group exercises for better display
  const exerciseGroups = sessionExercises.reduce((groups, exercise) => {
    const exerciseName = exercise.exercise.name;
    if (!groups[exerciseName]) {
      groups[exerciseName] = {
        exerciseName,
        exerciseId: exercise.exercise.id,
        // Get category name from the properly joined data
        category: exercise.exercise.category?.name || "Uncategorized",
        sets: [],
      };
    }

    groups[exerciseName].sets.push({
      setNumber: exercise.set_number,
      reps: exercise.reps,
      weight: exercise.weight,
    });

    return groups;
  }, {});

  return (
    <div className="pb-16">
      <PageTitle title={`${session.workout.name} Session`} />
      <div className="flex items-center mb-4">
        <BackButton url={`/protected/sessions`} />
      </div>

      {/* Session Details Card */}
      <Card className="mb-8 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-primary-100/50 to-primary-300/30 dark:from-primary-900/40 dark:to-primary-800/20 pb-3">
          <h2 className="text-lg font-bold">Session Details</h2>
        </CardHeader>
        <CardBody className="gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-default-500" />
              <div>
                <div className="text-sm text-default-500">Date</div>
                <div>
                  {new Date(session.started_at).toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-default-500" />
              <div>
                <div className="text-sm text-default-500">Duration</div>
                <div>
                  {durationMinutes} min {durationSeconds} sec
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-default-500" />
              <div>
                <div className="text-sm text-default-500">Exercises</div>
                <div>{Object.keys(exerciseGroups).length} completed</div>
              </div>
            </div>
          </div>

          <div className="text-sm text-default-500">
            <div>
              Started: {new Date(session.started_at).toLocaleTimeString()}
            </div>
            <div>
              Finished: {new Date(session.ended_at).toLocaleTimeString()}
            </div>
          </div>
        </CardBody>
      </Card>

      <h2 className="text-xl font-bold mb-4">Exercise Results</h2>

      {/* Exercise Cards */}
      <div className="space-y-6">
        {Object.values(exerciseGroups).map((group: any) => (
          <Card key={group.exerciseId} className="shadow-sm">
            <CardHeader className="pb-0">
              <div className="flex flex-col w-full">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">
                    {group.exerciseName}
                  </h3>
                  <Chip size="sm" variant="flat" color="primary">
                    {group.sets.length} sets
                  </Chip>
                </div>
                <div className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/70 mr-1.5"></div>
                  <span className="text-xs text-default-500">
                    {group.category}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardBody>
              <Table
                removeWrapper
                aria-label={`Sets for ${group.exerciseName}`}
                className="mt-2"
              >
                <TableHeader>
                  <TableColumn className="text-xs">SET</TableColumn>
                  <TableColumn className="text-xs">REPS</TableColumn>
                  <TableColumn className="text-xs">WEIGHT</TableColumn>
                </TableHeader>
                <TableBody>
                  {group.sets.map((set: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="py-2">{set.setNumber}</TableCell>
                      <TableCell className="py-2">{set.reps || "-"}</TableCell>
                      <TableCell className="py-2">
                        {set.weight
                          ? displayWeight(set.weight, useMetric)
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
