"use client";

import BackButton from "@/components/ui/back-button";
import PageTitle from "@/components/ui/page-title";
import { createClient } from "@/utils/supabase/client";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@nextui-org/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

// Fetch workout data
const getWorkoutData = async (supabase: any, workoutId: string) => {
  const { data: workout, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("id", workoutId)
    .single();

  if (error) throw error;
  return workout;
};

// Fetch workout exercises with exercise details
const getWorkoutExercises = async (supabase: any, workoutId: string) => {
  const { data: workoutExercises, error } = await supabase
    .from("workout_exercises")
    .select(
      `
      *,
      exercise:exercises(*)
    `
    )
    .eq("workout_id", workoutId);

  if (error) throw error;
  return workoutExercises;
};

export default function ViewWorkout() {
  const params = useParams();
  const workoutId = params.id as string;
  const [workout, setWorkout] = useState<any | null>(null);
  const [workoutExercises, setWorkoutExercises] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [workoutData, exercisesData] = await Promise.all([
          getWorkoutData(supabase, workoutId),
          getWorkoutExercises(supabase, workoutId),
        ]);
        setWorkout(workoutData);
        setWorkoutExercises(exercisesData);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch workout details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [workoutId]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!workout) return <div>Workout not found</div>;

  return (
    <>
      <PageTitle title={workout.name} />
      <BackButton url="/protected/workouts" />
      <div className="flex gap-4 mb-4">
        <Button
          color="primary"
          as={Link}
          href={`/protected/workouts/${workoutId}/edit`}
        >
          Edit Workout
        </Button>
        <Button
          color="primary"
          as={Link}
          href={`/protected/workouts/${workoutId}/session`}
          className="bg-green-600"
        >
          Start Workout
        </Button>
      </div>
      <div className="bg-creamyBeige p-4 rounded-lg mb-4">
        <h2 className="font-bold mb-2">Description</h2>
        <p>{workout.description}</p>
        <p className="text-sm text-gray-600 mt-2">
          Created: {new Date(workout.created_at).toLocaleDateString()}
        </p>
      </div>

      <h2 className="text-xl font-bold">Exercises</h2>

      <Table aria-label="Workout exercises">
        <TableHeader>
          <TableColumn>NAME</TableColumn>
          <TableColumn>SETS</TableColumn>
          <TableColumn>REPS</TableColumn>
          <TableColumn>WEIGHT</TableColumn>
        </TableHeader>
        <TableBody>
          {workoutExercises.map((workoutExercise) => (
            <TableRow key={workoutExercise.id}>
              <TableCell>{workoutExercise.exercise.name}</TableCell>
              <TableCell>{workoutExercise.sets}</TableCell>
              <TableCell>{workoutExercise.reps}</TableCell>
              <TableCell>{workoutExercise.weight}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
