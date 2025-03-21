"use client";

import BackButton from "@/components/ui/back-button";
import PageTitle from "@/components/ui/page-title";
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
import { Trash2 } from "lucide-react"; // Import Trash2 icon from lucide-react
import { useEffect, useState } from "react";
// 1. Import the useUnitPreference hook
import { useUnitPreference } from "@/hooks/useUnitPreference";
// 1. Import your units helper functions
import { convertToStorageUnit, kgToLbs } from "@/utils/units";

export default function CreateWorkout() {
  // 2. Use the hook at the top of your component
  const { useMetric, isLoading } = useUnitPreference();

  const [workoutExercises, setWorkoutExercises] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
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

  // Add this state for the custom exercise form error
  const [customExerciseError, setCustomExerciseError] = useState<string | null>(
    null
  );

  // 1. Add state to track existing workout names
  const [existingWorkoutNames, setExistingWorkoutNames] = useState<string[]>(
    []
  );

  // Fetch paginated exercises
  const fetchExercises = async (
    page: number,
    query: string = "",
    categoryId: string = "all"
  ) => {
    let exerciseQuery = supabase
      .from("exercises")
      .select("id, name, description, category_id, categories (name)", {
        count: "exact",
      });

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
      setExercises(data || []);
      setTotalPages(Math.ceil((count || 0) / PAGE_SIZE));
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchExercises(currentPage, searchQuery, categoryFilter);
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

      // Check if any exercise with this name already exists (custom or default)
      const { data: existingExercises, error: searchError } = await supabase
        .from("exercises")
        .select("id, name")
        .ilike("name", exerciseName as string);

      if (searchError) {
        console.error("Error checking for existing exercises:", searchError);
        return;
      }

      // If we found an exercise with the same name
      if (existingExercises && existingExercises.length > 0) {
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
        console.error("Error adding custom exercise:", error);
        return;
      }

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
      return; // Stop the submission if duplicate found
    }

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

      const { data: newWorkout, error: workoutError } = await supabase
        .from("workouts")
        .insert({
          name: workoutName,
          description: workoutDescription,
          user_id: user.id,
        })
        .select()
        .single();

      if (workoutError || !newWorkout) {
        console.error("Error creating workout:", workoutError);
        return;
      }

      const workoutId = newWorkout.id;

      // Create associated WorkoutExercise entries
      const workoutExerciseEntries = workoutExercises.map((exercise) => ({
        user_id: user.id,
        workout_id: workoutId,
        exercise_id: exercise.id,
        sets: exercise.sets,
        reps: exercise.reps,
        weight: exercise.weight,
        exercise_order: exercise.exercise_order,
      }));

      const { error: exercisesError } = await supabase
        .from("workout_exercises")
        .insert(workoutExerciseEntries);

      if (exercisesError) {
        console.error("Error creating workout exercises:", exercisesError);
        return;
      }

      setWorkoutExercises([]); // Clear exercises after submission
      e.currentTarget.reset(); // Reset form fields

      // Redirect to the workouts list page
      window.location.href = "/protected/workouts";
    } catch (error: any) {
      console.error("Unexpected Error", error);
    }

    // Clear errors and submit
    setErrors({});
  };

  const handleOpenModal = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setCurrentPage(1); // Reset to first page
    onOpen();
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <PageTitle title="New Workout" />

      <div className="flex items-center mb-4">
        <BackButton url="/protected/workouts" />
      </div>

      <Form
        className="w-full max-w-full justify-center items-center space-y-4"
        validationBehavior="native"
        validationErrors={errors}
        onReset={() => {
          // Clear errors
          setErrors({});

          // Clear all workout exercises
          setWorkoutExercises([]);

          // Reset selected category if needed
          setSelectedCategory(undefined);
        }}
        onSubmit={onWorkoutSubmit}
      >
        <div className="flex flex-col gap-4 w-full max-w-md">
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

          <h2 className="text-lg font-semibold mt-2">Exercises</h2>

          {/* Mobile-friendly table container */}
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
                  WEIGHT {!isLoading && `(${useMetric ? "KG" : "LBS"})`}
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
                          base: "min-w-0 max-w-[100px]", // Increased width
                          input: "text-center", // Center alignment
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
                        } // Convert to lbs for display if needed
                        size="md"
                        min={0} // Weight can be 0
                        classNames={{
                          base: "min-w-0 max-w-[100px]", // Increased width
                          input: "text-center", // Center alignment
                          innerWrapper: "h-9",
                        }}
                        onChange={(e) => {
                          const inputValue = Number(e.target.value) || 0;
                          // Convert to kg for storage if user is in lbs mode
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

          <div className="flex flex-wrap gap-2 mt-4">
            <Button color="primary" onPress={handleOpenModal}>
              Add Exercise
            </Button>
            <Button color="secondary" onPress={onCustomOpen}>
              Add Custom Exercise
            </Button>
          </div>

          {/* Updated Modal for Selecting Exercises */}
          <Modal
            backdrop="opaque"
            isOpen={isOpen}
            onClose={onClose}
            radius="lg"
            onOpenChange={onOpenChange}
            placement="center" // Add this for proper positioning
            scrollBehavior="inside" // Better scrolling on mobile
            classNames={{
              base: "m-0 mx-auto", // Center the modal
              wrapper: "items-center justify-center p-2", // Ensure wrapper is centered with padding
            }}
          >
            <ModalContent className="max-w-[95vw] sm:max-w-md">
              {(onClose) => (
                <>
                  <ModalHeader>
                    <h3 className="text-lg font-bold">Select Exercise</h3>
                  </ModalHeader>
                  <ModalBody>
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
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="sm:w-1/3"
                        size="sm"
                      >
                        <>
                          <SelectItem key="all" value="all">
                            All Categories
                          </SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </>
                      </Select>
                    </div>

                    {/* Table content remains the same */}
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

          {/* Updated Modal for Adding Custom Exercise - Apply the same changes */}
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

                    <form
                      onSubmit={handleCustomExerciseSubmit}
                      className="space-y-4"
                    >
                      <Input
                        isRequired
                        label="Exercise Name"
                        name="exerciseName"
                        placeholder="Enter exercise name"
                        isInvalid={!!customExerciseError}
                        errorMessage={customExerciseError}
                        onChange={() =>
                          customExerciseError && setCustomExerciseError(null)
                        } // Clear error when user types
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
                        <>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </>
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
                    </form>
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
          <div className="flex flex-col sm:flex-row gap-2 mt-6 w-full">
            <Button className="w-full" color="primary" type="submit">
              Submit
            </Button>
            <Button
              type="reset"
              variant="bordered"
              className="w-full sm:min-w-[120px] sm:w-auto flex items-center justify-center"
              startContent={<Trash2 className="h-4 w-4 mr-1 flex-shrink-0" />}
            >
              <span>Clear All</span>
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}
