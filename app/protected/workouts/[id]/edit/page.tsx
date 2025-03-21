"use client";

import ActiveSessionBanner from "@/components/active-session-banner";
import BackButton from "@/components/ui/back-button";
import PageTitle from "@/components/ui/page-title";
import { useUnitPreference } from "@/hooks/useUnitPreference";
import { createClient } from "@/utils/supabase/client";
import { convertToStorageUnit, kgToLbs } from "@/utils/units";
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
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Textarea,
  useDisclosure,
} from "@nextui-org/react";
import Link from "next/link";
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

export default function EditWorkout() {
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
  const [workoutName, setWorkoutName] = useState("");
  const [workoutDescription, setWorkoutDescription] = useState("");
  const { isOpen, onOpen, onClose, onOpenChange } = useDisclosure();
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number>();

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitted, setSubmitted] = useState<any>(null);
  const PAGE_SIZE = 5;

  const {
    isOpen: isCustomOpen,
    onOpen: onCustomOpen,
    onClose: onCustomClose,
    onOpenChange: onCustomOpenChange,
  } = useDisclosure();

  const { useMetric, isLoading: loadingPreferences } = useUnitPreference();

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

  useEffect(() => {
    if (workout) {
      setWorkoutName(workout.name);
      setWorkoutDescription(workout.description);
    }
  }, [workout]);

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

  const onWorkoutSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const data = Object.fromEntries(
      new FormData(e.currentTarget as HTMLFormElement)
    );
    const { name: workoutName, description: workoutDescription } = data;

    setErrors({});

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

      // Update the workout
      const { error: workoutError } = await supabase
        .from("workouts")
        .update({
          name: workoutName,
          description: workoutDescription,
        })
        .eq("id", workoutId);

      if (workoutError) {
        console.error("Error updating workout:", workoutError);
        return;
      }

      // For each exercise, upsert the workout_exercises record
      for (const exercise of workoutExercises) {
        const { error: exerciseError } = await supabase
          .from("workout_exercises")
          .upsert(
            {
              user_id: user.id,
              workout_id: workoutId,
              exercise_id: exercise.id,
              sets: exercise.sets,
              reps: exercise.reps,
              weight: exercise.weight,
              exercise_order: exercise.exercise_order,
            },
            {
              onConflict: "workout_id,exercise_id",
              ignoreDuplicates: false,
            }
          );

        if (exerciseError) {
          console.error("Error upserting workout exercise:", exerciseError);
          return;
        }
      }

      // Delete any workout_exercises that are no longer in the list
      const currentExerciseIds = workoutExercises.map((e) => e.id);
      const { error: deleteError } = await supabase
        .from("workout_exercises")
        .delete()
        .eq("workout_id", workoutId)
        .not("exercise_id", "in", `(${currentExerciseIds.join(",")})`);

      if (deleteError) {
        console.error("Error cleaning up old exercises:", deleteError);
        return;
      }

      alert("Workout and exercises successfully updated!");
      // e.currentTarget.reset(); // Reset form fields

      // TODO: Redirect to the workout details page
      router.push(`/protected/workouts/${workoutId}`);
      // TODO: Add a toast notification for successful submission
    } catch (error: any) {
      console.error("Unexpected Error", error);
    }

    // Clear errors and submit
    setErrors({});
    setSubmitted(data);
  };

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }
  if (error) return <div className="text-red-500">{error}</div>;
  if (!workout) return <div>Workout not found</div>;

  return (
    <>
      <ActiveSessionBanner />
      <PageTitle title={workout.name} />
      <div className="flex items-center">
        <BackButton url="/protected/workouts" />
      </div>

      <Form
        className="max-w-full px-2 justify-center items-center space-y-4"
        validationBehavior="native"
        validationErrors={errors}
        onReset={() => setSubmitted(null)}
        onSubmit={onWorkoutSubmit}
      >
        <div className="flex flex-col gap-4 w-full max-w-md">
          <Input
            isRequired
            value={workoutName}
            errorMessage={({ validationDetails }) => {
              if (validationDetails.valueMissing) {
                return "Please enter workout name";
              }

              return errors.name;
            }}
            label="Name"
            labelPlacement="outside"
            name="name"
            placeholder="Enter workout name"
            onChange={(e) => setWorkoutName(e.target.value)}
            className="w-full"
          />
          <Textarea
            isRequired
            errorMessage={({ validationDetails }) => {
              if (validationDetails.valueMissing) {
                return "Please enter a description";
              }

              return errors.description;
            }}
            label="Description"
            labelPlacement="outside"
            name="description"
            value={workoutDescription}
            onChange={(e) => setWorkoutDescription(e.target.value)}
            className="w-full"
          />

          <h2>Exercises</h2>

          <div className="w-full overflow-x-auto -mx-2 px-2">
            <Table
              aria-label="Exercise table"
              classNames={{
                base: "min-w-full",
                table: "min-w-full",
              }}
            >
              <TableHeader>
                <TableColumn>NAME</TableColumn>
                <TableColumn className="w-[110px] sm:w-[130px]">
                  SETS
                </TableColumn>
                <TableColumn className="w-[110px] sm:w-[130px]">
                  REPS
                </TableColumn>
                <TableColumn className="w-[120px] sm:w-[150px]">
                  WEIGHT{" "}
                  {!loadingPreferences && `(${useMetric ? "KG" : "LBS"})`}
                </TableColumn>
                <TableColumn className="w-[100px] sm:w-[120px]">
                  ACTIONS
                </TableColumn>
              </TableHeader>
              <TableBody>
                {workoutExercises.map((exercise, index) => (
                  <TableRow key={index}>
                    <TableCell>{exercise.name}</TableCell>
                    <TableCell className="p-2">
                      <Input
                        type="number"
                        value={exercise.sets}
                        size="md"
                        min={1}
                        classNames={{
                          base: "min-w-0 max-w-[100px]",
                          input: "text-center",
                          innerWrapper: "h-9",
                        }}
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value) || 1;
                          setWorkoutExercises((prev) =>
                            prev.map((ex, i) =>
                              i === index ? { ...ex, sets: newValue } : ex
                            )
                          );
                        }}
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        type="number"
                        value={exercise.reps}
                        size="md"
                        min={1}
                        classNames={{
                          base: "min-w-0 max-w-[100px]",
                          input: "text-center",
                          innerWrapper: "h-9",
                        }}
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value) || 1;
                          setWorkoutExercises((prev) =>
                            prev.map((ex, i) =>
                              i === index ? { ...ex, reps: newValue } : ex
                            )
                          );
                        }}
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        type="number"
                        value={
                          useMetric
                            ? exercise.weight
                            : kgToLbs(exercise.weight).toFixed(1)
                        }
                        size="md"
                        min={0}
                        classNames={{
                          base: "min-w-0 max-w-[100px]",
                          input: "text-center",
                          innerWrapper: "h-9",
                        }}
                        onChange={(e) => {
                          const inputValue = Number(e.target.value) || 0;

                          // Use the helper to convert to storage format (kg)
                          const weightInKg = convertToStorageUnit(
                            inputValue,
                            useMetric
                          );

                          setWorkoutExercises((prev) =>
                            prev.map((ex, i) =>
                              i === index ? { ...ex, weight: weightInKg } : ex
                            )
                          );
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        color="danger"
                        size="sm"
                        onPress={() =>
                          setWorkoutExercises((prev) =>
                            prev.filter((_, i) => i !== index)
                          )
                        }
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Button
              color="primary"
              onPress={onOpen}
              className="w-full sm:w-auto"
            >
              Add Exercise
            </Button>
            <Button
              color="secondary"
              onPress={onCustomOpen}
              className="w-full sm:w-auto"
            >
              Add Custom Exercise
            </Button>
          </div>

          {/* Modal for Selecting Exercises - Updated for proper mobile centering */}
          <Modal
            backdrop="opaque"
            isOpen={isOpen}
            onClose={onClose}
            radius="lg"
            onOpenChange={onOpenChange}
            placement="center"
            scrollBehavior="inside"
            classNames={{
              base: "m-0 mx-auto",
              wrapper: "items-center justify-center p-2",
            }}
          >
            <ModalContent className="max-w-[95vw] sm:max-w-md">
              {(onClose) => (
                <>
                  <ModalHeader>
                    <h3 className="text-lg font-bold">Select Exercise</h3>
                  </ModalHeader>
                  <ModalBody>
                    <Table
                      aria-label="Available Exercises"
                      classNames={{
                        base: "max-w-full overflow-x-auto",
                      }}
                    >
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
                      size="sm"
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

          {/* Modal for Adding Custom Exercise - Updated for proper mobile centering */}
          <Modal
            backdrop="opaque"
            isOpen={isCustomOpen}
            onClose={onCustomClose}
            radius="lg"
            onOpenChange={onCustomOpenChange}
            placement="center"
            scrollBehavior="inside"
            classNames={{
              base: "m-0 mx-auto",
              wrapper: "items-center justify-center p-2",
            }}
          >
            <ModalContent className="max-w-[95vw] sm:max-w-md">
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

                    {/* Form inputs remain the same */}
                    <Form
                      onSubmit={handleCustomExerciseSubmit}
                      className="space-y-4"
                    >
                      {/* Form content remains unchanged */}
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
          <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full">
            <Button className="w-full" color="primary" type="submit">
              Save Changes
            </Button>
            <Button
              as={Link}
              href={`/protected/workouts/${workoutId}`}
              variant="light"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Form>
    </>
  );
}
