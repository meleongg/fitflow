"use client";

import ActiveSessionBanner from "@/components/active-session-banner";
import ClientOnly from "@/components/client-only";
import BackButton from "@/components/ui/back-button";
import PageTitle from "@/components/ui/page-title";
import { useUnitPreference } from "@/hooks/useUnitPreference";
import { createClient } from "@/utils/supabase/client";
import { convertToStorageUnit } from "@/utils/units";
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
import { ArrowDown, ArrowUp, Dumbbell, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
    .eq("workout_id", workoutId)
    .order("exercise_order", { ascending: true });

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

  const [exerciseToDelete, setExerciseToDelete] = useState<{
    exercise: any;
    index: number;
  } | null>(null);
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();

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
    // Add success toast
    toast.success(`${exercise.name} added to workout`);
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
        toast.error("Failed to fetch workout details");
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
      // Show loading toast
      const toastId = toast.loading("Adding custom exercise...");

      // Get the authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        toast.dismiss(toastId);
        toast.error("Authentication error. Please try again.");
        throw new Error("Unable to fetch user information");
      }

      if (!user) {
        toast.dismiss(toastId);
        toast.error("Not logged in. Please sign in again.");
        throw new Error("No authenticated user found");
      }

      // Insert the custom exercise into the exercises table
      const { data: insertedExercise, error } = await supabase
        .from("exercises")
        .insert({
          name: exerciseName,
          category_id: selectedCategory || null,
          description: exerciseDescription || null,
          user_id: user.id,
          is_default: false,
        })
        .select()
        .single();

      if (error) {
        toast.dismiss(toastId);
        toast.error("Failed to add custom exercise");
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

      // Show success toast and dismiss loading toast
      toast.dismiss(toastId);
      toast.success(`${insertedExercise.name} added to your exercise library!`);

      onCustomClose();
      fetchExercises(currentPage); // Refresh the exercises list
    } catch (error: any) {
      console.error("Error:", error.message);
      toast.error(`Error: ${error.message || "Failed to add exercise"}`);
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
      // Show loading toast
      const toastId = toast.loading("Saving workout changes...");

      // Get the authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        toast.dismiss(toastId);
        toast.error("Authentication error. Please try again.");
        throw new Error("Unable to fetch user information");
      }

      if (!user) {
        toast.dismiss(toastId);
        toast.error("Not logged in. Please sign in again.");
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
        toast.dismiss(toastId);
        toast.error("Failed to update workout details");
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
          toast.dismiss(toastId);
          toast.error("Failed to save exercise information");
          console.error("Error upserting workout exercise:", exerciseError);
          return;
        }
      }

      // Delete any workout_exercises that are no longer in the list
      const currentExerciseIds = workoutExercises.map((e) => e.id);

      if (currentExerciseIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("workout_exercises")
          .delete()
          .eq("workout_id", workoutId)
          .not("exercise_id", "in", `(${currentExerciseIds.join(",")})`);

        if (deleteError) {
          toast.dismiss(toastId);
          toast.error("Failed to remove deleted exercises");
          console.error("Error cleaning up old exercises:", deleteError);
          return;
        }
      }

      // Show success toast
      toast.dismiss(toastId);
      toast.success("Workout updated successfully!");

      // Redirect to the workout details page
      router.push(`/protected/workouts/${workoutId}`);
    } catch (error: any) {
      console.error("Unexpected Error", error);
      toast.error(`Error: ${error.message || "Failed to update workout"}`);
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

          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Exercises</h2>
          </div>

          {/* Mobile-friendly table container */}
          <div className="w-full overflow-x-auto -mx-2 px-2">
            {workoutExercises.length === 0 ? (
              // Show empty state outside the table
              <div className="text-center py-12 border rounded-lg">
                <div className="flex flex-col items-center gap-3 text-gray-500">
                  <Dumbbell className="w-10 h-10" />
                  <p>No exercises added yet</p>
                  <Button size="sm" color="primary" onPress={onOpen}>
                    Add Your First Exercise
                  </Button>
                </div>
              </div>
            ) : (
              // Only show table when we have exercises
              <Table
                aria-label="Exercise table"
                classNames={{
                  base: "min-w-full",
                  table: "min-w-full",
                }}
              >
                <TableHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900">
                  <TableColumn className="w-[80px] min-w-[80px] text-center">
                    ORDER
                  </TableColumn>
                  <TableColumn>NAME</TableColumn>
                  <TableColumn className="w-[120px] min-w-[120px]">
                    SETS
                  </TableColumn>
                  <TableColumn className="w-[120px] min-w-[120px]">
                    REPS
                  </TableColumn>
                  <TableColumn className="w-[140px] min-w-[140px]">
                    WEIGHT{" "}
                    {!loadingPreferences && `(${useMetric ? "KG" : "LBS"})`}
                  </TableColumn>
                  <TableColumn className="w-[100px] min-w-[100px] text-center">
                    ACTIONS
                  </TableColumn>
                </TableHeader>
                <TableBody>
                  {workoutExercises.map((exercise, index) => (
                    <TableRow key={exercise.id}>
                      <TableCell className="w-[80px] min-w-[80px]">
                        <div className="flex justify-center gap-1">
                          <Button
                            size="sm"
                            isIconOnly
                            variant="light"
                            isDisabled={index === 0}
                            onPress={() => {
                              setWorkoutExercises((prev) => {
                                const newExercises = [...prev];
                                if (index > 0) {
                                  // Swap with previous exercise
                                  [
                                    newExercises[index],
                                    newExercises[index - 1],
                                  ] = [
                                    newExercises[index - 1],
                                    newExercises[index],
                                  ];
                                }
                                // Update exercise_order for each
                                return newExercises.map((ex, i) => ({
                                  ...ex,
                                  exercise_order: i,
                                }));
                              });
                              toast.success("Exercise moved up");
                            }}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            isIconOnly
                            variant="light"
                            isDisabled={index === workoutExercises.length - 1}
                            onPress={() => {
                              setWorkoutExercises((prev) => {
                                const newExercises = [...prev];
                                if (index < newExercises.length - 1) {
                                  // Swap with next exercise
                                  [
                                    newExercises[index],
                                    newExercises[index + 1],
                                  ] = [
                                    newExercises[index + 1],
                                    newExercises[index],
                                  ];
                                }
                                // Update exercise_order for each
                                return newExercises.map((ex, i) => ({
                                  ...ex,
                                  exercise_order: i,
                                }));
                              });
                              toast.success("Exercise moved down");
                            }}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>

                      <TableCell>{exercise.name}</TableCell>
                      <TableCell className="p-2">
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={String(exercise.sets)}
                          size="md"
                          classNames={{
                            base: "min-w-[80px] w-[80px]",
                            input: "text-center px-0",
                            innerWrapper: "h-9",
                          }}
                          onChange={(e) => {
                            const inputValue = e.target.value;

                            if (inputValue === "") {
                              setWorkoutExercises((prev) =>
                                prev.map((ex, i) =>
                                  i === index ? { ...ex, sets: "" } : ex
                                )
                              );
                              return;
                            }

                            // Only allow digits
                            if (!/^\d+$/.test(inputValue)) {
                              return;
                            }

                            const newValue = parseInt(inputValue);
                            setWorkoutExercises((prev) =>
                              prev.map((ex, i) =>
                                i === index ? { ...ex, sets: newValue } : ex
                              )
                            );
                          }}
                          onBlur={(e) => {
                            // When focus leaves, ensure valid value (min 1)
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
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={String(exercise.reps)}
                          size="md"
                          classNames={{
                            base: "min-w-[80px] w-[80px]",
                            input: "text-center px-0",
                            innerWrapper: "h-9",
                          }}
                          onChange={(e) => {
                            const inputValue = e.target.value;

                            if (inputValue === "") {
                              setWorkoutExercises((prev) =>
                                prev.map((ex, i) =>
                                  i === index ? { ...ex, reps: "" } : ex
                                )
                              );
                              return;
                            }

                            // Only allow digits
                            if (!/^\d+$/.test(inputValue)) {
                              return;
                            }

                            const newValue = parseInt(inputValue);
                            setWorkoutExercises((prev) =>
                              prev.map((ex, i) =>
                                i === index ? { ...ex, reps: newValue } : ex
                              )
                            );
                          }}
                          onBlur={(e) => {
                            // When focus leaves, ensure valid value (min 1)
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
                          type="text"
                          inputMode="decimal"
                          pattern="[0-9]*\.?[0-9]*"
                          value={String(exercise.weight)}
                          size="md"
                          classNames={{
                            base: "min-w-[90px] w-[90px]",
                            input: "text-center px-0",
                            innerWrapper: "h-9",
                          }}
                          onChange={(e) => {
                            const inputValue = e.target.value;

                            // Allow empty input
                            if (inputValue === "") {
                              setWorkoutExercises((prev) =>
                                prev.map((ex, i) =>
                                  i === index ? { ...ex, weight: "" } : ex
                                )
                              );
                              return;
                            }

                            // Allow any input that could be a valid decimal number
                            if (/^(\d*\.?\d*)?$/.test(inputValue)) {
                              // Store the raw string value during editing
                              setWorkoutExercises((prev) =>
                                prev.map((ex, i) =>
                                  i === index
                                    ? { ...ex, weight: inputValue }
                                    : ex
                                )
                              );
                            }
                          }}
                          onBlur={(e) => {
                            // When focus leaves, convert to number and ensure valid value (min 0)
                            const value = e.target.value;

                            // Handle special case of just a decimal point
                            if (value === ".") {
                              setWorkoutExercises((prev) =>
                                prev.map((ex, i) =>
                                  i === index ? { ...ex, weight: 0 } : ex
                                )
                              );
                              return;
                            }

                            const newValue = parseFloat(value) || 0;
                            const weightInKg = convertToStorageUnit(
                              newValue,
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
                        <div className="flex justify-center">
                          <Button
                            color="danger"
                            size="sm"
                            variant="light"
                            isIconOnly
                            onPress={() => {
                              // Store the exercise to be deleted
                              setExerciseToDelete({
                                exercise,
                                index,
                              });
                              // Open the confirmation modal
                              onDeleteOpen();
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Exercise deletion confirmation modal */}
          <ClientOnly>
            <Modal
              backdrop="opaque"
              isOpen={isDeleteOpen}
              onClose={() => {
                setExerciseToDelete(null);
                onDeleteClose();
              }}
              radius="lg"
              placement="center"
              classNames={{
                base: "m-0 mx-auto",
                wrapper: "items-center justify-center p-2",
              }}
            >
              <ModalContent>
                {(onClose) => (
                  <>
                    <ModalHeader className="flex flex-col gap-1">
                      <h3 className="text-lg font-bold">Remove Exercise</h3>
                    </ModalHeader>
                    <ModalBody>
                      <p>
                        Are you sure you want to remove{" "}
                        <span className="font-semibold">
                          {exerciseToDelete?.exercise.name}
                        </span>{" "}
                        from this workout?
                      </p>
                    </ModalBody>
                    <ModalFooter>
                      <Button
                        color="default"
                        variant="light"
                        onPress={() => {
                          setExerciseToDelete(null);
                          onClose();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        color="danger"
                        onPress={() => {
                          if (exerciseToDelete) {
                            setWorkoutExercises((prev) => {
                              const filtered = prev.filter(
                                (_, i) => i !== exerciseToDelete.index
                              );
                              return filtered.map((ex, i) => ({
                                ...ex,
                                exercise_order: i,
                              }));
                            });
                            toast.success(
                              `${exerciseToDelete.exercise.name} removed`
                            );
                            onClose();
                            setExerciseToDelete(null);
                          }
                        }}
                      >
                        Remove
                      </Button>
                    </ModalFooter>
                  </>
                )}
              </ModalContent>
            </Modal>
          </ClientOnly>

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
