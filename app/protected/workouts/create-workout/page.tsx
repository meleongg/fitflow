"use client";

// Import dynamic from next/dynamic at the top
import dynamic from "next/dynamic";
import { useRef } from "react";

import ClientOnly from "@/components/client-only";
import BackButton from "@/components/ui/back-button";
import PageTitle from "@/components/ui/page-title";
import { useUnitPreference } from "@/hooks/useUnitPreference";
import { createClient } from "@/utils/supabase/client";
import {
  Button,
  Chip,
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
  Textarea,
  useDisclosure,
} from "@nextui-org/react";
import { ArrowDown, ArrowUp, Dumbbell, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Import the utility functions at the top of your file
import { convertToStorageUnit } from "@/utils/units";

interface Exercise {
  id: string;
  name: string;
  description?: string;
  category_id?: number;
  categories?: { name: string };
  is_default?: boolean;
  sets: number | string;
  reps: number | string;
  weight: number | string;
  exercise_order: number;
}

interface DbExercise {
  id: string;
  name: string;
  description?: string;
  category_id?: number;
  categories?: { name?: string };
  is_default?: boolean;
}

const CreateWorkoutPage = () => {
  const router = useRouter();
  const { useMetric, isLoading } = useUnitPreference();
  const [workoutExercises, setWorkoutExercises] = useState<Exercise[]>([]);
  const [exercises, setExercises] = useState<DbExercise[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { isOpen, onOpen, onClose, onOpenChange } = useDisclosure();

  const {
    isOpen: isCustomOpen,
    onOpen: onCustomOpen,
    onClose: onCustomClose,
    onOpenChange: onCustomOpenChange,
  } = useDisclosure();

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number>();

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const supabase = createClient();
  const PAGE_SIZE = 5;

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [customExerciseError, setCustomExerciseError] = useState<string | null>(
    null
  );

  const [existingWorkoutNames, setExistingWorkoutNames] = useState<string[]>(
    []
  );

  const [recentExercises, setRecentExercises] = useState<DbExercise[]>([]);

  // Add this state to track modal loading
  const [isModalLoading, setIsModalLoading] = useState(false);

  // Add this new state
  const [isSearching, setIsSearching] = useState(false);

  // Add these states near your other state declarations
  const [exerciseToDelete, setExerciseToDelete] = useState<{
    exercise: Exercise;
    index: number;
  } | null>(null);
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();

  // Add a form reference near your other state declarations
  const formRef = useRef<HTMLFormElement>(null);

  // Add this state near your other state declarations
  const [isProgrammaticReset, setIsProgrammaticReset] = useState(false);

  // Add this state for selected workout category
  const [workoutCategory, setWorkoutCategory] = useState<string | null>(null);

  // Find "Other" category ID to set as default
  useEffect(() => {
    if (categories.length > 0 && !workoutCategory) {
      const otherCategory = categories.find(
        (c) => c.name.toLowerCase() === "other"
      );
      if (otherCategory) {
        setWorkoutCategory(otherCategory.id.toString());
      } else if (categories.length > 0) {
        setWorkoutCategory(categories[0].id.toString());
      }
    }
  }, [categories, workoutCategory]);

  // Update fetchExercises to return a Promise
  const fetchExercises = async (
    page: number,
    query: string = "",
    categoryId: string = "all"
  ) => {
    try {
      let exerciseQuery = supabase
        .from("exercises")
        .select(
          "id, name, description, category_id, categories:categories(name)",
          {
            count: "exact",
          }
        );

      // Add search filter if query exists
      if (query) {
        exerciseQuery = exerciseQuery.ilike("name", `%${query}%`);
      }

      // Add category filter if not "all"
      if (categoryId !== "all") {
        exerciseQuery = exerciseQuery.eq("category_id", categoryId);
      }

      const { data, error, count } = await exerciseQuery.range(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE - 1
      );

      if (error) {
        console.error("Error fetching exercises:", error);
      } else {
        setExercises((data as DbExercise[]) || []);
        setTotalPages(Math.ceil((count || 0) / PAGE_SIZE));
      }

      // Return data for promise chaining
      return data;
    } catch (err) {
      console.error("Error fetching exercises:", err);
      return [];
    }
  };

  // Update the useEffect for search
  useEffect(() => {
    setIsSearching(true);

    const timer = setTimeout(() => {
      fetchExercises(currentPage, searchQuery, categoryFilter).then(() => {
        setIsSearching(false);
      });
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [currentPage, searchQuery, categoryFilter]);

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

  // 2. Update the useEffect to fetch existing workout names
  useEffect(() => {
    const fetchExistingWorkoutNames = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          console.error("Auth error:", authError);
          return;
        }

        const { data, error } = await supabase
          .from("workouts")
          .select("name")
          .eq("user_id", user.id);

        if (error) {
          console.error("Error fetching workout names:", error);
          return;
        }

        // Extract all workout names to an array
        setExistingWorkoutNames(
          data.map((workout) => workout.name.toLowerCase())
        );
      } catch (err) {
        console.error("Error fetching workout names:", err);
      }
    };

    fetchExistingWorkoutNames();
  }, []);

  // Update the function signature to be more explicit
  const handleAddExercise = (exercise: DbExercise) => {
    // Check if exercise already exists in workout
    const exerciseExists = workoutExercises.some((ex) => ex.id === exercise.id);

    if (exerciseExists) {
      toast.error(`${exercise.name} is already in your workout`);
      return; // Stop here and don't add the exercise again
    }

    // Original logic - only runs if exercise isn't a duplicate
    setWorkoutExercises((prev) => [
      ...prev,
      {
        ...exercise,
        sets: 1,
        reps: 10,
        weight: 0,
        exercise_order: prev.length,
      } as Exercise, // Cast to Exercise since we're adding the missing properties
    ]);

    // Show toast when exercise is added
    toast.success(`${exercise.name} added to workout`);

    onClose();
  };

  // Update the handleCustomExerciseSubmit function to check for duplicates
  const handleCustomExerciseSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Reset error state
    setCustomExerciseError(null);

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

      // Check if any exercise with this name already exists (custom or default)
      const { data: existingExercises, error: searchError } = await supabase
        .from("exercises")
        .select("id, name")
        .ilike("name", exerciseName as string);

      if (searchError) {
        toast.dismiss(toastId);
        toast.error("Failed to check for existing exercises.");
        console.error("Error checking for existing exercises:", searchError);
        return;
      }

      // If we found an exercise with the same name
      if (existingExercises && existingExercises.length > 0) {
        toast.dismiss(toastId);
        toast.error("An exercise with this name already exists");
        setCustomExerciseError("An exercise with this name already exists");
        return;
      }

      // Continue with exercise creation since no duplicate was found
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
        toast.error("Failed to add custom exercise.");
        console.error("Error adding custom exercise:", error);
        return;
      }

      // Success - show toast
      toast.dismiss(toastId);
      toast.success(`${insertedExercise.name} added to your exercise library!`);

      // Add exercise to table and close modal
      handleAddExercise({
        id: insertedExercise.id,
        name: insertedExercise.name,
        category_id: insertedExercise.category_id,
        description: insertedExercise.description,
        is_default: insertedExercise.is_default,
      });

      // Close the modal
      onCustomClose();

      // Refresh exercises list in background
      fetchExercises(currentPage);
    } catch (error: any) {
      console.error("Error:", error.message);
      toast.error(`Error: ${error.message || "Failed to add exercise"}`);
    }
  };

  // 3. Update the onWorkoutSubmit function to check for duplicates
  const onWorkoutSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const data = Object.fromEntries(
      new FormData(e.currentTarget as HTMLFormElement)
    );
    const { name: workoutName, description: workoutDescription } = data;

    // Reset errors
    setErrors({});

    // Check for duplicate workout name
    if (existingWorkoutNames.includes(workoutName.toString().toLowerCase())) {
      setErrors({ name: "A workout with this name already exists" });
      toast.error("A workout with this name already exists");
      return; // Stop the submission if duplicate found
    }

    try {
      // Show loading toast
      const toastId = toast.loading("Creating workout...");

      // Get the authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        toast.error("Authentication error. Please try again.");
        throw new Error("Unable to fetch user information");
      }

      if (!user) {
        toast.error("Not logged in. Please sign in again.");
        throw new Error("No authenticated user found");
      }

      const { data: newWorkout, error: workoutError } = await supabase
        .from("workouts")
        .insert({
          name: workoutName,
          description: workoutDescription,
          user_id: user.id,
          category_id: workoutCategory ? parseInt(workoutCategory) : null, // Add this line
        })
        .select()
        .single();

      if (workoutError || !newWorkout) {
        toast.dismiss(toastId);
        toast.error("Failed to create workout. Please try again.");
        console.error("Error creating workout:", workoutError);
        return;
      }

      const workoutId = newWorkout.id;

      // Create associated WorkoutExercise entries
      const workoutExerciseEntries = workoutExercises.map((exercise) => {
        // Get the raw weight value
        const rawWeight = Number(exercise.weight) || 0;

        // Convert to storage unit (kg) using your utility function
        const convertedWeight = convertToStorageUnit(rawWeight, useMetric);

        return {
          user_id: user.id,
          workout_id: workoutId,
          exercise_id: exercise.id,
          sets: Number(exercise.sets) || 0,
          reps: Number(exercise.reps) || 0,
          weight: convertedWeight, // Store the properly converted weight
          exercise_order: exercise.exercise_order,
        };
      });

      const { error: exercisesError } = await supabase
        .from("workout_exercises")
        .insert(workoutExerciseEntries);

      if (exercisesError) {
        toast.dismiss(toastId);
        toast.error("Failed to add exercises. Please try again.");
        console.error("Error creating workout exercises:", exercisesError);
        return;
      }

      // Success - show success toast
      toast.dismiss(toastId);
      toast.success("Workout created successfully!");

      setWorkoutExercises([]); // Clear exercises after submission

      const formElement = formRef.current;
      if (formElement) {
        // Set a custom attribute to indicate programmatic reset
        formElement.setAttribute("data-programmatic-reset", "true");
        formElement.reset();
      }

      // Use Next.js router instead of window.location
      router.push("/protected/workouts");
    } catch (error: any) {
      console.error("Unexpected Error", error);
      toast.error(`Error: ${error.message || "Failed to create workout"}`);
    }

    // Clear errors and submit
    setErrors({});
  };

  // Update handleOpenModal to wait for data
  const handleOpenModal = () => {
    // Set loading state
    setIsModalLoading(true);

    // Reset all query parameters
    setSearchQuery("");
    setCategoryFilter("all");
    setCurrentPage(1);

    // Open the modal
    onOpen();

    // Fetch fresh data and only turn off loading when complete
    fetchExercises(1, "", "all").then(() => {
      // Wait a bit before removing loading state to ensure smooth transition
      setTimeout(() => {
        setIsModalLoading(false);
      }, 300);
    });
  };

  // Add a function to handle opening the custom exercise modal
  const handleOpenCustomModal = () => {
    // Reset form state
    setCustomExerciseError(null);
    setSelectedCategory(undefined);

    // Open the modal
    onCustomOpen();
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <PageTitle title="New Workout" />

      <div className="flex items-center mb-4">
        <BackButton url="/protected/workouts" />
      </div>

      <Form
        ref={formRef} // Add this ref
        className="w-full max-w-full justify-center items-center space-y-4"
        validationBehavior="native"
        validationErrors={errors}
        onReset={(e) => {
          // Clear errors
          setErrors({});

          // Clear all workout exercises
          setWorkoutExercises([]);

          // Reset selected category to default
          const otherCategory = categories.find(
            (c) => c.name.toLowerCase() === "other"
          );
          if (otherCategory) {
            setWorkoutCategory(otherCategory.id.toString());
          } else if (categories.length > 0) {
            setWorkoutCategory(categories[0].id.toString());
          } else {
            setWorkoutCategory(null);
          }

          // Check the custom attribute instead of state
          const isProgrammatic =
            e.currentTarget.getAttribute("data-programmatic-reset") === "true";

          // Only show toast if it's a manual reset (not from submission)
          if (!isProgrammatic) {
            toast.info("Form has been reset");
          }

          // Remove the attribute
          e.currentTarget.removeAttribute("data-programmatic-reset");
        }}
        onSubmit={onWorkoutSubmit}
      >
        <div className="flex flex-col gap-4 w-full max-w-md sm:max-w-lg md:max-w-2xl">
          <Input
            isRequired
            errorMessage={({ validationDetails }) => {
              if (validationDetails.valueMissing) {
                return "Please enter workout name";
              }
              return errors.name; // This will show our duplicate name error
            }}
            label="Name"
            labelPlacement="outside"
            name="name"
            placeholder="Enter workout name"
            isInvalid={!!errors.name} // Add this to show the error state
            onChange={() => errors.name && setErrors({})} // Clear error when user changes input
          />

          <Input
            label="Description"
            labelPlacement="outside"
            name="description"
            placeholder="Enter workout description (optional)"
            type="text"
          />

          {/* Add category dropdown here */}
          <Select
            label="Category"
            labelPlacement="outside"
            placeholder="Select workout category"
            selectedKeys={workoutCategory ? [workoutCategory] : []}
            onChange={(e) => setWorkoutCategory(e.target.value)}
            className="w-full"
          >
            {categories.map((category) => (
              <SelectItem
                key={category.id.toString()}
                value={category.id.toString()}
              >
                {category.name}
              </SelectItem>
            ))}
          </Select>

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
                  <Button size="sm" color="primary" onPress={handleOpenModal}>
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
                    WEIGHT {!isLoading && `(${useMetric ? "KG" : "LBS"})`}
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
                            // This includes "." by itself, which will be handled on blur
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
                            setWorkoutExercises((prev) =>
                              prev.map((ex, i) =>
                                i === index ? { ...ex, weight: newValue } : ex
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

          <div className="flex flex-wrap gap-2 mt-4">
            <Button color="primary" onPress={handleOpenModal}>
              Add Exercise
            </Button>
            <Button color="secondary" onPress={handleOpenCustomModal}>
              Add Custom Exercise
            </Button>
          </div>

          {/* Updated Modal for Selecting Exercises */}
          <ClientOnly>
            <Modal
              backdrop="opaque"
              isOpen={isOpen}
              onClose={onClose}
              radius="lg"
              onOpenChange={onOpenChange}
              placement="top" // Changed from center to top
              scrollBehavior="inside"
              classNames={{
                base: "max-w-[95%] sm:max-w-md mx-auto max-h-[80vh]", // Add max height
                wrapper: "items-start justify-center p-2 pt-8", // Align to top
                header:
                  "pb-0 border-b border-default-200 sticky top-0 z-10 bg-background", // Make header sticky
                body: "p-4 overflow-auto pb-12", // Add bottom padding for keyboard space
                footer:
                  "pt-3 px-6 pb-5 flex flex-row gap-3 justify-end sticky bottom-0 z-10 bg-background border-t border-default-200", // Make footer sticky
              }}
            >
              <ModalContent className="max-w-[95vw] sm:max-w-md">
                {(onClose) => (
                  <>
                    <ModalHeader>
                      <h3 className="text-lg font-bold">Select Exercise</h3>
                    </ModalHeader>
                    <ModalBody>
                      {isModalLoading ? (
                        <div className="flex justify-center items-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <p className="text-sm text-gray-500">
                              Loading exercises...
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col sm:flex-row gap-3 mb-4">
                            {/* Search input */}
                            <Input
                              type="search"
                              placeholder="Search exercises..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="flex-1"
                              startContent={
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                >
                                  <path
                                    d="M6.5 12C9.53757 12 12 9.53757 12 6.5C12 3.46243 9.53757 1 6.5 1C3.46243 1 1 3.46243 1 6.5C1 9.53757 3.46243 12 6.5 12Z"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M11 11L15 15"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              }
                              isClearable
                              onClear={() => setSearchQuery("")}
                            />

                            {/* Category filter */}
                            <Select
                              aria-label="Filter exercises by category"
                              placeholder="Filter by category"
                              selectedKeys={[categoryFilter]}
                              onChange={(e) =>
                                setCategoryFilter(e.target.value)
                              }
                              className="sm:w-1/3"
                              size="sm"
                            >
                              <>
                                <SelectItem key="all" value="all">
                                  All Categories
                                </SelectItem>
                                {categories.map((category) => (
                                  <SelectItem
                                    key={category.id}
                                    value={category.id}
                                  >
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </>
                            </Select>
                          </div>

                          {/* Table content */}
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
                            <TableBody
                              emptyContent={
                                isSearching ? (
                                  <div className="py-5">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto my-4"></div>
                                    <p className="text-center text-gray-500">
                                      Searching...
                                    </p>
                                  </div>
                                ) : (
                                  "No exercises found"
                                )
                              }
                            >
                              {exercises.map((exercise) => (
                                <TableRow key={exercise.id}>
                                  <TableCell>{exercise.name}</TableCell>
                                  <TableCell>
                                    {exercise.categories &&
                                    exercise.categories.name
                                      ? exercise.categories.name
                                      : "N/A"}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      size="sm"
                                      color="primary"
                                      onPress={() =>
                                        handleAddExercise(exercise)
                                      }
                                    >
                                      Add
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>

                          {/* Add Pagination component outside the Table */}
                          <Pagination
                            className="mt-4"
                            total={totalPages}
                            initialPage={1}
                            page={currentPage}
                            onChange={(page) => setCurrentPage(page)}
                          />
                        </>
                      )}
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
          </ClientOnly>

          {/* Updated Modal for Adding Custom Exercise - Apply the same changes */}
          <ClientOnly>
            <Modal
              backdrop="opaque"
              isOpen={isCustomOpen}
              onClose={onCustomClose}
              radius="lg"
              onOpenChange={onCustomOpenChange}
              placement="top" // Changed from center to top
              scrollBehavior="inside"
              classNames={{
                base: "max-w-[95%] sm:max-w-md mx-auto max-h-[80vh]", // Add max height
                wrapper: "items-start justify-center p-2 pt-8", // Align to top
                header:
                  "pb-0 border-b border-default-200 sticky top-0 z-10 bg-background", // Make header sticky
                body: "p-4 overflow-auto pb-12", // Add bottom padding for keyboard
                footer:
                  "pt-3 px-6 pb-5 flex flex-row gap-3 justify-end sticky bottom-0 z-10 bg-background border-t border-default-200", // Make footer sticky
              }}
            >
              <ModalContent className="max-w-md mx-auto">
                {(onCustomClose) => (
                  <>
                    <ModalHeader className="flex flex-col gap-1">
                      <h3 className="text-lg font-bold">Add Custom Exercise</h3>
                    </ModalHeader>

                    <ModalBody>
                      {/* Note section with improved styling */}
                      <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 p-3 rounded-lg mb-4 text-sm">
                        <strong>NOTE:</strong> Creating a custom exercise here
                        will add it to your Exercise Library.
                      </div>

                      <form
                        id="custom-exercise-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCustomExerciseSubmit(e);
                        }}
                        className="flex flex-col gap-5"
                      >
                        <Input
                          isRequired
                          label="Exercise Name"
                          name="exerciseName"
                          placeholder="Enter exercise name"
                          variant="bordered"
                          labelPlacement="outside"
                          isInvalid={!!customExerciseError}
                          errorMessage={customExerciseError}
                          onChange={() =>
                            customExerciseError && setCustomExerciseError(null)
                          }
                          classNames={{
                            label:
                              "text-sm font-medium text-default-700 mb-1.5",
                            inputWrapper: "shadow-sm",
                          }}
                        />

                        <Select
                          isRequired
                          label="Category"
                          placeholder="Select a category"
                          selectedKeys={
                            selectedCategory ? [String(selectedCategory)] : []
                          }
                          onChange={(e) =>
                            setSelectedCategory(Number(e.target.value))
                          }
                          name="exerciseCategory"
                          variant="bordered"
                          labelPlacement="outside"
                          classNames={{
                            label:
                              "text-sm font-medium text-default-700 mb-1.5",
                            trigger: "shadow-sm",
                            popoverContent: "shadow-lg",
                          }}
                        >
                          {categories.map((category) => (
                            <SelectItem
                              key={String(category.id)}
                              value={category.id}
                            >
                              {category.name}
                            </SelectItem>
                          ))}
                        </Select>

                        {/* Replace Input with Textarea for description */}
                        <Textarea
                          label="Description"
                          name="exerciseDescription"
                          placeholder="Describe the exercise (optional)"
                          variant="bordered"
                          labelPlacement="outside"
                          minRows={3}
                          classNames={{
                            label:
                              "text-sm font-medium text-default-700 mb-1.5",
                            inputWrapper: "shadow-sm",
                          }}
                        />
                      </form>
                    </ModalBody>

                    <ModalFooter className="pt-5 border-t border-default-200">
                      <Button
                        color="danger"
                        variant="flat"
                        onPress={onCustomClose}
                      >
                        Cancel
                      </Button>
                      <Button
                        color="primary"
                        onPress={() => {
                          const form = document.getElementById(
                            "custom-exercise-form"
                          ) as HTMLFormElement;
                          if (form) {
                            form.requestSubmit();
                          }
                        }}
                      >
                        Add Exercise
                      </Button>
                    </ModalFooter>
                  </>
                )}
              </ModalContent>
            </Modal>
          </ClientOnly>
          <div className="flex flex-col sm:flex-row gap-2 mt-6 w-full mb-16">
            <Button className="w-full" color="primary" type="submit">
              Submit
            </Button>
            <Button
              type="reset"
              variant="bordered"
              className="w-full sm:min-w-[120px] sm:w-auto"
              startContent={<Trash2 className="h-4 w-4 mr-1 flex-shrink-0" />}
            >
              <span>Clear All</span>
            </Button>
          </div>
        </div>
      </Form>
      {recentExercises && recentExercises.length > 0 && (
        <div className="mt-4">
          <p className="text-sm mb-2">Recently Used:</p>
          <div className="flex flex-wrap gap-2">
            {recentExercises.map((exercise) => (
              <Chip
                key={exercise.id}
                className="cursor-pointer"
                variant="flat"
                onClick={() => handleAddExercise(exercise)}
              >
                {exercise.name}
              </Chip>
            ))}
          </div>
        </div>
      )}
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
          placement="top" // Changed from center to top
          scrollBehavior="inside"
          classNames={{
            base: "max-w-[95%] sm:max-w-md mx-auto max-h-[80vh]", // Add max height
            wrapper: "items-start justify-center p-2 pt-8", // Align to top
            header:
              "pb-0 border-b border-default-200 sticky top-0 z-10 bg-background", // Make header sticky
            body: "p-4 overflow-auto", // No need for extra padding in this simple modal
            footer:
              "pt-3 px-6 pb-5 flex flex-row gap-3 justify-end sticky bottom-0 z-10 bg-background border-t border-default-200", // Make footer sticky
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
    </div>
  );
};

// Use dynamic import with SSR disabled
export default dynamic(() => Promise.resolve(CreateWorkoutPage), {
  ssr: false,
});
