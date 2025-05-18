"use client";

import ActiveSessionBanner from "@/components/active-session-banner";
import ClientOnly from "@/components/client-only";
import BackButton from "@/components/ui/back-button";
import PageTitle from "@/components/ui/page-title";
import { useSession } from "@/contexts/SessionContext";
import { useUnitPreference } from "@/hooks/useUnitPreference";
import { createClient } from "@/utils/supabase/client";
import { convertFromStorageUnit } from "@/utils/units";
import {
  Button,
  Card,
  Chip,
  Divider,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Skeleton,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tabs,
} from "@nextui-org/react";
import {
  Calendar,
  Clock,
  Dumbbell,
  Edit,
  HistoryIcon,
  Play,
  ScrollText,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// Adding type definition at the top of the file - add this with your other imports
type CategoryExercises = {
  [category: string]: any[];
};

// Fetch workout data with category
const getWorkoutData = async (supabase: any, workoutId: string) => {
  const { data: workout, error } = await supabase
    .from("workouts")
    .select(
      `
      *,
      category:categories(*)
    `
    )
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
      exercise:exercises(*, categories(*))
    `
    )
    .eq("workout_id", workoutId)
    .order("exercise_order", { ascending: true });

  if (error) throw error;
  return workoutExercises;
};

// Fetch workout history
const getWorkoutHistory = async (supabase: any, workoutId: string) => {
  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("workout_id", workoutId)
    .order("ended_at", { ascending: false })
    .limit(5);

  if (error) throw error;
  return sessions || [];
};

export default function ViewWorkout() {
  const router = useRouter();
  const params = useParams();
  const workoutId = params.id as string;
  const [workout, setWorkout] = useState<any | null>(null);
  const [workoutExercises, setWorkoutExercises] = useState<any[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const { activeSession } = useSession();
  const { useMetric, defaultRestTimer } = useUnitPreference();
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [selectedTab, setSelectedTab] = useState("exercises");
  const hasShownLoadToast = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [workoutData, exercisesData, historyData] = await Promise.all([
          getWorkoutData(supabase, workoutId),
          getWorkoutExercises(supabase, workoutId),
          getWorkoutHistory(supabase, workoutId),
        ]);

        setWorkout(workoutData);
        setWorkoutExercises(exercisesData);
        setWorkoutHistory(historyData);

        // Only show toast if we haven't shown it yet
        if (!hasShownLoadToast.current) {
          toast.success("Workout details loaded");
          hasShownLoadToast.current = true;
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch workout details");
        toast.error("Failed to load workout details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [workoutId]);

  // Calculate more accurate workout duration based on exercises and sets
  const calculateWorkoutDuration = (exercises: any[]): number => {
    if (!exercises || exercises.length === 0) return 0;

    // Calculate total sets across all exercises
    const totalSets = exercises.reduce((total, exercise) => {
      // Default to 1 set if sets is missing or invalid
      const setCount = Number(exercise.sets) || 1;
      return total + setCount;
    }, 0);

    // Time calculations (in minutes):
    // - Average of 45 seconds per set (includes exercise time)
    // - 30 seconds transition between different exercises
    // - 1 minute initial setup time
    const setTime = totalSets * 0.75;
    const transitionTime = (exercises.length - 1) * 0.5;
    const setupTime = 1;
    // Rest time in minutes (convert from seconds)
    const restMinutes = defaultRestTimer / 60;
    const totalRestTime = (totalSets - exercises.length) * restMinutes;

    // Total estimated time rounded up to nearest minute
    return Math.max(
      1,
      Math.ceil(setTime + transitionTime + totalRestTime + setupTime)
    );
  };

  // Group exercises by category for better organization
  const exercisesByCategory = workoutExercises.reduce((acc, item) => {
    const categoryName = item.exercise?.categories?.name || "Uncategorized";
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(item);
    return acc;
  }, {} as CategoryExercises);

  const startWorkout = () => {
    if (activeSession?.workoutId) {
      setShowSessionWarning(true);
    } else {
      toast.info(`Starting ${workout?.name} session`);
      router.push(`/protected/workouts/${workoutId}/session`);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 flex flex-col gap-4">
        <Skeleton className="h-12 w-2/3 rounded-lg mb-4" />

        <div className="flex gap-3 mb-6">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>

        <Skeleton className="h-32 w-full rounded-lg mb-6" />

        <Skeleton className="h-8 w-40 rounded-lg mb-4" />

        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg mb-2" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-64">
        <div className="text-red-500 text-center mb-4">{error}</div>
        <Button color="primary" onPress={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-64">
        <div className="text-center mb-4">Workout not found</div>
        <Button as={Link} href="/protected/workouts" color="primary">
          Back to Workouts
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <ActiveSessionBanner />

      <PageTitle title={workout.name} />

      <div className="flex items-center mb-4">
        <BackButton url="/protected/workouts" />
      </div>

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>
              Created {new Date(workout.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            color="primary"
            as={Link}
            href={`/protected/workouts/${workoutId}/edit`}
            startContent={<Edit className="h-4 w-4" />}
            className="dark:text-white"
          >
            Edit
          </Button>
          <Button
            color="success"
            onPress={startWorkout}
            startContent={<Play className="h-4 w-4" />}
            className="dark:text-white"
          >
            Start Workout
          </Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <div className="p-6 md:flex-1">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-primary" />
              Description
            </h2>

            {workout.description ? (
              <p className="mt-2">{workout.description}</p>
            ) : (
              <p className="mt-2 text-gray-500 italic">
                No description provided
              </p>
            )}
          </div>

          <Divider orientation="vertical" className="hidden md:block" />

          <div className="p-6 md:w-1/3 bg-default-50 dark:bg-default-100">
            <h3 className="font-semibold text-sm uppercase text-gray-500 mb-3">
              Workout Summary
            </h3>

            <div className="space-y-3">
              {/* Add this section for category */}
              {workout.category && (
                <div className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    Category:{" "}
                    <Chip size="sm" variant="flat" color="primary">
                      {workout.category.name}
                    </Chip>
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  {workoutExercises.length} Exercises
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  Estimated time: {calculateWorkoutDuration(workoutExercises)}{" "}
                  minutes
                </span>
              </div>

              {workoutHistory.length > 0 && (
                <div className="flex items-center gap-2">
                  <HistoryIcon className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    Last performed:{" "}
                    {new Date(workoutHistory[0].ended_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Tabs
        selectedKey={selectedTab}
        onSelectionChange={(key) => setSelectedTab(key as string)}
        aria-label="Workout tabs"
      >
        <Tab
          key="exercises"
          title={
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4" />
              <span>Exercises ({workoutExercises.length})</span>
            </div>
          }
        >
          <div className="mt-4">
            {Object.entries(exercisesByCategory).map(
              ([category, exercises]) => {
                // Type assertion to help TypeScript understand the structure
                const typedExercises = exercises as any[];

                return (
                  <div key={category} className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center">
                        <h3 className="text-lg font-semibold">{category}</h3>
                        <Chip
                          className="ml-2"
                          size="sm"
                          variant="flat"
                          color="primary"
                        >
                          {typedExercises.length}{" "}
                          {typedExercises.length === 1
                            ? "exercise"
                            : "exercises"}
                        </Chip>
                      </div>

                      {/* Calculate total sets and volume for this category */}
                      <div className="flex gap-2 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <span>
                            {typedExercises.reduce(
                              (sum, ex) => sum + (Number(ex.sets) || 0),
                              0
                            )}{" "}
                            sets
                          </span>
                        </div>
                        {useMetric && (
                          <div className="hidden sm:flex items-center gap-1">
                            <span>
                              {typedExercises
                                .reduce((sum, ex) => {
                                  const sets = Number(ex.sets) || 0;
                                  const weight = Number(ex.weight) || 0;
                                  const reps = Number(ex.reps) || 0;
                                  return sum + sets * weight * reps;
                                }, 0)
                                .toLocaleString()}{" "}
                              kg volume
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="overflow-auto">
                      <Table
                        aria-label={`${category} exercises`}
                        removeWrapper
                        className="mb-4"
                      >
                        <TableHeader>
                          <TableColumn>NAME</TableColumn>
                          <TableColumn className="text-center">
                            SETS
                          </TableColumn>
                          <TableColumn className="text-center">
                            REPS
                          </TableColumn>
                          <TableColumn className="text-center">
                            WEIGHT {`(${useMetric ? "KG" : "LBS"})`}
                          </TableColumn>
                        </TableHeader>
                        <TableBody>
                          {typedExercises.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div className="font-medium">
                                  {item.exercise.name}
                                </div>
                                {item.exercise.description && (
                                  <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                                    {item.exercise.description}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {item.sets}
                              </TableCell>
                              <TableCell className="text-center">
                                {item.reps}
                              </TableCell>
                              <TableCell className="text-center">
                                {item.weight > 0
                                  ? convertFromStorageUnit(
                                      item.weight,
                                      useMetric
                                    ).toFixed(1)
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </Tab>

        <Tab
          key="history"
          title={
            <div className="flex items-center gap-2">
              <HistoryIcon className="h-4 w-4" />
              <span>History ({workoutHistory.length})</span>
            </div>
          }
          disabled={workoutHistory.length === 0}
        >
          <div className="mt-4">
            {workoutHistory.length > 0 ? (
              <Table aria-label="Workout history">
                <TableHeader>
                  <TableColumn>DATE</TableColumn>
                  <TableColumn>DURATION</TableColumn>
                </TableHeader>
                <TableBody>
                  {workoutHistory.map((session) => {
                    // Calculate duration from timestamps
                    const startTime = new Date(session.started_at).getTime();
                    const endTime = new Date(session.ended_at).getTime();
                    const durationSeconds = Math.floor(
                      (endTime - startTime) / 1000
                    );
                    const minutes = Math.floor(durationSeconds / 60);
                    const seconds = durationSeconds % 60;

                    return (
                      <TableRow key={session.id}>
                        <TableCell>
                          {new Date(session.ended_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {minutes} min {seconds} sec
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 border rounded-lg">
                <div className="flex flex-col items-center gap-3 text-gray-500">
                  <HistoryIcon className="w-10 h-10" />
                  <p>No workout history yet</p>
                  <Button color="primary" size="sm" onPress={startWorkout}>
                    Start First Workout
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Tab>
      </Tabs>

      {/* Session warning modal - updated to use NextUI */}
      <ClientOnly>
        <Modal
          isOpen={showSessionWarning}
          onClose={() => setShowSessionWarning(false)}
          placement="center"
          backdrop="blur"
          classNames={{
            base: "border border-default-200",
            wrapper: "z-50",
          }}
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  <h3 className="text-xl font-bold">
                    Active Session in Progress
                  </h3>
                </ModalHeader>
                <ModalBody>
                  <p>
                    You already have an active workout session for "
                    <span className="font-semibold">
                      {activeSession?.workoutName}
                    </span>
                    ".
                  </p>
                  <p>
                    Please complete or end that session before starting a new
                    one.
                  </p>
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={onClose}>
                    Close
                  </Button>
                  <Button
                    as={Link}
                    href={`/protected/workouts/${activeSession?.workoutId}/session`}
                    color="primary"
                  >
                    Return to Session
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </ClientOnly>
    </div>
  );
}
