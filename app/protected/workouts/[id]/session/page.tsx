"use client";

import BackButton from "@/components/ui/back-button";
import PageTitle from "@/components/ui/page-title";
import Timer, { TIMER_STORAGE_KEY } from "@/components/ui/timer";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { db, OfflineWorkoutSession } from "@/utils/indexedDB";
import { createClient } from "@/utils/supabase/client";
import {
  Button,
  Form,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Pagination,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  useDisclosure,
} from "@nextui-org/react";
import { useParams, useRouter } from "next/navigation";
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

  // Transform the data to match the expected format
  const transformedExercises = workoutExercises.map((we: any) => ({
    id: we.exercise.id,
    name: we.exercise.name,
    sets: we.sets,
    reps: we.reps,
    weight: we.weight,
    exercise_order: we.exercise_order,
    category_id: we.exercise.category_id,
    description: we.exercise.description,
  }));

  return transformedExercises;
};

interface SessionExercise {
  id: string;
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  actualSets: {
    setNumber: number;
    reps: number;
    weight: number;
    completed: boolean;
  }[];
}

// Format date consistently for both server and client
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

export default function WorkoutSession() {
  const params = useParams();
  const workoutId = params.id as string;
  const supabase = createClient();
  const router = useRouter();
  const [workout, setWorkout] = useState<any | null>(null);
  const [workoutExercises, setWorkoutExercises] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const { isOpen, onOpen, onClose, onOpenChange } = useDisclosure();
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number>();

  const [submitted, setSubmitted] = useState<any>(null);
  const PAGE_SIZE = 5;

  const {
    isOpen: isCustomOpen,
    onOpen: onCustomOpen,
    onClose: onCustomClose,
    onOpenChange: onCustomOpenChange,
  } = useDisclosure();

  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>(
    []
  );

  const isOnline = useOnlineStatus();

  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionStartTime) {
      setSessionStartTime(new Date().toISOString());
    }
  }, []);

  // Fetch paginated exercises
  const fetchExercises = async (page: number) => {
    const { data, error, count } = await supabase
      .from("exercises")
      .select("id, name, description, category_id, categories (name)", {
        count: "exact",
      })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (error) {
      console.error("Error fetching exercises:", error);
    } else {
      setExercises(data || []);
      setTotalPages(Math.ceil((count || 0) / PAGE_SIZE));
    }
  };

  useEffect(() => {
    fetchExercises(currentPage);
  }, [currentPage]);

  // Fetch categories on page load
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("id, name");
        if (error) {
          console.error("Error fetching categories:", error);
          return;
        }
        setCategories(data || []);
      } catch (err) {
        console.error("Error:", err);
      }
    };

    fetchCategories();
  }, []);

  const handleAddExercise = (exercise: any) => {
    setWorkoutExercises((prev) => [
      ...prev,
      {
        ...exercise,
        sets: 1,
        reps: 10,
        weight: 0,
        exercise_order: prev.length,
      },
    ]);
    onClose();
  };

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

  useEffect(() => {
    if (workoutExercises.length > 0) {
      setSessionExercises(
        workoutExercises.map((exercise) => ({
          id: exercise.id,
          name: exercise.name,
          targetSets: exercise.sets,
          targetReps: exercise.reps,
          targetWeight: exercise.weight,
          actualSets: Array.from({ length: exercise.sets }, (_, i) => ({
            setNumber: i + 1,
            reps: 0,
            weight: 0,
            completed: false,
          })),
        }))
      );
    }
  }, [workoutExercises]);

  const handleCustomExerciseSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const data = Object.fromEntries(
      new FormData(e.currentTarget as HTMLFormElement)
    );
    const { exerciseName, exerciseDescription } = data;

    try {
      // Get the authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error("Unable to fetch user information");
      }

      if (!user) {
        throw new Error("No authenticated user found");
      }

      // Insert the custom exercise into the exercises table
      const { data: insertedExercise, error } = await supabase
        .from("exercises")
        .insert({
          name: exerciseName,
          category_id: selectedCategory || null,
          description: exerciseDescription || null,
          user_id: user.id, // Use the user's ID as the foreign key
          is_default: false, // Mark it as a custom (non-default) exercise
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding custom exercise:", error);
        return;
      }

      // Call handleAddExercise to update the page
      handleAddExercise({
        id: insertedExercise.id,
        name: insertedExercise.name,
        category_id: insertedExercise.category_id,
        description: insertedExercise.description,
        is_default: insertedExercise.is_default,
      });

      alert("Custom exercise added successfully!");
      onCustomClose();
      fetchExercises(currentPage); // Refresh the exercises list
    } catch (error: any) {
      console.error("Error:", error.message);
    }
  };

  const onSessionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const endTime = new Date().toISOString();

    if (isOnline) {
      setSubmitted(true);
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error("Not authenticated");
        }

        // Use sessionStartTime instead of 'now'
        const { data: session, error: sessionError } = await supabase
          .from("sessions")
          .insert({
            user_id: user.id,
            workout_id: workoutId,
            started_at: sessionStartTime, // Use the stored start time
            ended_at: endTime, // Use the current time as end time
          })
          .select()
          .single();

        if (sessionError || !session) {
          throw new Error("Failed to create session");
        }

        // Filter out uncompleted sets and format data
        const sessionExercisesData = sessionExercises.flatMap((exercise) =>
          exercise.actualSets
            .filter((set) => set.completed) // Only include completed sets
            .map((set) => ({
              user_id: user.id,
              session_id: session.id,
              exercise_id: exercise.id,
              set_number: set.setNumber,
              reps: parseInt(set.reps.toString()), // Ensure numbers
              weight: parseFloat(set.weight.toString()), // Ensure numbers
            }))
        );

        const { error: exercisesError } = await supabase
          .from("session_exercises")
          .insert(sessionExercisesData);

        if (exercisesError) {
          console.error("Exercise insertion error:", exercisesError);
          throw new Error("Failed to save session exercises");
        }

        // Success - redirect to session summary
        router.push(`/protected/sessions/${session.id}`);
      } catch (error: any) {
        console.error("Error completing session:", error);
        // TODO: Show error toast
        setSubmitted(false);
      }
    } else {
      // For offline storage
      const offlineSession: OfflineWorkoutSession = {
        workout_id: workoutId,
        started_at: sessionStartTime!, // Use the stored start time
        ended_at: endTime, // Use the current time as end time
        exercises: sessionExercises.map((exercise) => ({
          exercise_id: exercise.id,
          sets: exercise.actualSets.map((set) => ({
            reps: parseInt(set.reps.toString()),
            weight: parseFloat(set.weight.toString()),
            completed: set.completed,
          })),
        })),
        synced: false,
      };

      await db.saveWorkoutSession(offlineSession);
      alert("Workout saved offline. Will sync when online.");
    }

    // Clear timer state after workout completion
    localStorage.removeItem(TIMER_STORAGE_KEY);
  };

  // Add this function with the other handlers
  const handleDeleteExercise = (exerciseIndex: number) => {
    setSessionExercises((prev) =>
      prev.filter((_, index) => index !== exerciseIndex)
    );
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!workout) return <div>Workout not found</div>;

  return (
    <>
      <PageTitle title={workout.name} />
      <BackButton url="/protected/workouts" />

      {/* Add Timer component below the title */}
      <div className="bg-creamyBeige p-4 rounded-lg mb-4">
        <Timer />
      </div>

      <div className="bg-creamyBeige p-4 rounded-lg mb-4">
        <h2 className="font-bold mb-2">Description</h2>
        <p>{workout.description}</p>
        <p className="text-sm text-gray-600 mt-2" suppressHydrationWarning>
          Created: {formatDate(workout.created_at)}
        </p>
      </div>
      <Form
        className="max-w-full justify-center items-center space-y-4"
        validationBehavior="native"
        onReset={() => setSubmitted(null)}
        onSubmit={onSessionSubmit}
      >
        <div className="flex flex-col gap-4 max-w-md">
          {/* Modal for Selecting Exercises */}
          <Modal
            backdrop="opaque"
            isOpen={isOpen}
            onClose={onClose}
            radius="lg"
            onOpenChange={onOpenChange}
            className="flex items-center justify-center"
          >
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader>
                    <h3 className="text-lg font-bold">Select Exercise</h3>
                  </ModalHeader>
                  <ModalBody>
                    <Table aria-label="Available Exercises">
                      <TableHeader>
                        <TableColumn>NAME</TableColumn>
                        <TableColumn>CATEGORY</TableColumn>
                        <TableColumn>ACTION</TableColumn>
                      </TableHeader>
                      <TableBody>
                        {exercises.map((exercise) => (
                          <TableRow key={exercise.id}>
                            <TableCell>{exercise.name}</TableCell>
                            <TableCell>
                              {exercise.categories?.name || "N/A"}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                color="primary"
                                onPress={() => handleAddExercise(exercise)}
                              >
                                Add
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Pagination
                      total={totalPages}
                      initialPage={currentPage}
                      onChange={(page) => setCurrentPage(page)}
                    />
                  </ModalBody>
                  <ModalFooter>
                    <Button color="secondary" onPress={onClose}>
                      Close
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>

          {/* Modal for Adding Custom Exercise */}
          <Modal
            backdrop="opaque"
            isOpen={isCustomOpen}
            onClose={onCustomClose}
            radius="lg"
            onOpenChange={onCustomOpenChange}
            className="flex items-center justify-center"
          >
            <ModalContent>
              {(onCustomClose) => (
                <>
                  <ModalHeader>
                    <h3 className="text-lg font-bold">Add Custom Exercise</h3>
                  </ModalHeader>
                  <ModalBody>
                    <div className="bg-yellow-100 text-yellow-700 p-2 rounded mb-4">
                      <strong>NOTE:</strong> Creating a custom exercise here
                      will add it to your Exercise Library.
                    </div>

                    {/* Add your form inputs for creating a custom exercise */}
                    <Form
                      onSubmit={handleCustomExerciseSubmit}
                      className="space-y-4"
                    >
                      <Input
                        isRequired
                        label="Exercise Name"
                        name="exerciseName"
                        placeholder="Enter exercise name"
                      />

                      {/* Dropdown for categories */}
                      <Select
                        isRequired
                        label="Category"
                        placeholder="Select a category"
                        value={selectedCategory}
                        onChange={(e) =>
                          setSelectedCategory(Number(e.target.value))
                        }
                        name="exerciseCategory"
                      >
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </Select>

                      <Input
                        label="Description"
                        name="exerciseDescription"
                        placeholder="Optional description"
                        type="text"
                      />

                      <Button type="submit" color="primary" className="w-full">
                        Add Exercise
                      </Button>
                    </Form>
                  </ModalBody>
                  <ModalFooter>
                    <Button color="secondary" onPress={onCustomClose}>
                      Close
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>
          <div className="w-full">
            {sessionExercises.map((exercise, exerciseIndex) => (
              <div
                key={exercise.id}
                className="mb-8 bg-white p-4 rounded-lg shadow"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">{exercise.name}</h3>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600">
                      Target: {exercise.targetSets} sets × {exercise.targetReps}{" "}
                      reps @ {exercise.targetWeight}kg
                    </div>
                    <Button
                      color="danger"
                      size="sm"
                      variant="ghost"
                      onPress={() => handleDeleteExercise(exerciseIndex)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                <Table aria-label={`${exercise.name} sets`}>
                  <TableHeader>
                    <TableColumn>SET</TableColumn>
                    <TableColumn>REPS</TableColumn>
                    <TableColumn>WEIGHT (KG)</TableColumn>
                    <TableColumn>STATUS</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {exercise.actualSets.map((set, setIndex) => (
                      <TableRow key={setIndex}>
                        <TableCell>{set.setNumber}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={String(set.reps)}
                            className="w-20"
                            onChange={(e) => {
                              const newExercises = [...sessionExercises];
                              newExercises[exerciseIndex].actualSets[
                                setIndex
                              ].reps = Number(e.target.value);
                              setSessionExercises(newExercises);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={String(set.weight)}
                            className="w-20"
                            onChange={(e) => {
                              const newExercises = [...sessionExercises];
                              newExercises[exerciseIndex].actualSets[
                                setIndex
                              ].weight = Number(e.target.value);
                              setSessionExercises(newExercises);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            color={set.completed ? "success" : "primary"}
                            size="sm"
                            onPress={() => {
                              const newExercises = [...sessionExercises];
                              newExercises[exerciseIndex].actualSets[
                                setIndex
                              ].completed = !set.completed;
                              setSessionExercises(newExercises);
                            }}
                          >
                            {set.completed ? "Completed" : "Mark Complete"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    onPress={() => {
                      const newExercises = [...sessionExercises];
                      newExercises[exerciseIndex].actualSets.push({
                        setNumber: exercise.actualSets.length + 1,
                        reps: 0,
                        weight: 0,
                        completed: false,
                      });
                      setSessionExercises(newExercises);
                    }}
                  >
                    Add Set
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex gap-4 mt-4">
              <div>
                <Button color="primary" onPress={onOpen}>
                  Add Exercise
                </Button>
              </div>
              <div>
                <Button color="secondary" onPress={onCustomOpen}>
                  Add Custom Exercise
                </Button>
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <Button color="success" size="lg" type="submit">
                Complete Workout
              </Button>
            </div>
          </div>
        </div>
      </Form>
      {!isOnline && (
        <div className="bg-yellow-100 p-4 rounded-md mb-4">
          You're offline. Your workout will be saved locally and synced when
          back online.
        </div>
      )}
    </>
  );
}
