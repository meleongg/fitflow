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
import { useEffect, useState } from "react";

export default function CreateWorkout() {
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
  const [submitted, setSubmitted] = useState<any>(null);
  const supabase = createClient();
  const PAGE_SIZE = 5;

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
    // TODO: Fetch existing workout names and check for duplicates
  }, []);

  const handleAddExercise = (exercise: any) => {
    setWorkoutExercises((prev) => [
      ...prev,
      { ...exercise, sets: 1, reps: 10, weight: 0 },
    ]);
    onClose();
  };

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
        exercise_order: 0, // default value for now
      }));

      const { error: exercisesError } = await supabase
        .from("workout_exercises")
        .insert(workoutExerciseEntries);

      if (exercisesError) {
        console.error("Error creating workout exercises:", exercisesError);
        return;
      }

      alert("Workout and exercises successfully created!");
      setWorkoutExercises([]); // Clear exercises after submission
      // e.currentTarget.reset(); // Reset form fields

      // TODO: Redirect to the workout details page
    } catch (error: any) {
      console.error("Unexpected Error", error);
    }

    // Clear errors and submit
    setErrors({});
    setSubmitted(data);
  };

  return (
    <>
      <PageTitle title="New Workout" />
      <BackButton url="/protected/workouts" />
      <div className="bg-creamyBeige p-4 rounded-lg">
        Choose from our existing exercises or create your own.
      </div>

      <Form
        className="w-full justify-center items-center space-y-4"
        validationBehavior="native"
        validationErrors={errors}
        onReset={() => setSubmitted(null)}
        onSubmit={onWorkoutSubmit}
      >
        <div className="flex flex-col gap-4 max-w-md">
          <Input
            isRequired
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
          />

          <Input
            isRequired
            errorMessage={({ validationDetails }) => {
              if (validationDetails.valueMissing) {
                return "Please enter a description";
              }
              if (validationDetails.typeMismatch) {
                return "Please enter a valid description";
              }
            }}
            label="Description"
            labelPlacement="outside"
            name="description"
            placeholder="Enter workout description"
            type="text"
          />

          <div className="flex gap-4">
            <Button className="w-full" color="primary" type="submit">
              Submit
            </Button>
            <Button type="reset" variant="bordered">
              Reset
            </Button>
          </div>
        </div>

        {submitted && (
          <div className="text-small text-default-500 mt-4">
            Submitted data: <pre>{JSON.stringify(submitted, null, 2)}</pre>
          </div>
        )}
      </Form>

      <h2>Exercises</h2>
      <Table aria-label="Exercise table">
        <TableHeader>
          <TableColumn>NAME</TableColumn>
          <TableColumn>SETS</TableColumn>
          <TableColumn>REPS</TableColumn>
          <TableColumn>WEIGHT</TableColumn>
          <TableColumn>ACTIONS</TableColumn>
        </TableHeader>
        <TableBody>
          {workoutExercises.map((exercise, index) => (
            <TableRow key={index}>
              <TableCell>{exercise.name}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={exercise.sets}
                  classNames={{
                    input: "min-w-4",
                  }}
                  onChange={(e) =>
                    setWorkoutExercises((prev) =>
                      prev.map((ex, i) =>
                        i === index ? { ...ex, sets: +e.target.value } : ex
                      )
                    )
                  }
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={exercise.reps}
                  classNames={{
                    input: "min-w-4",
                  }}
                  onChange={(e) =>
                    setWorkoutExercises((prev) =>
                      prev.map((ex, i) =>
                        i === index ? { ...ex, reps: +e.target.value } : ex
                      )
                    )
                  }
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={exercise.weight}
                  classNames={{
                    input: "min-w-4",
                  }}
                  onChange={(e) =>
                    setWorkoutExercises((prev) =>
                      prev.map((ex, i) =>
                        i === index ? { ...ex, weight: +e.target.value } : ex
                      )
                    )
                  }
                />
              </TableCell>
              <TableCell>
                <Button
                  color="danger"
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
                  <strong>NOTE:</strong> Creating a custom exercise here will
                  add it to your Exercise Library.
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
    </>
  );
}
