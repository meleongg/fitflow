"use client";

import BackButton from "@/components/ui/back-button";
import PageTitle from "@/components/ui/page-title";
import Timer, { TIMER_STORAGE_KEY } from "@/components/ui/timer";
import { useSession } from "@/contexts/SessionContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useUnitPreference } from "@/hooks/useUnitPreference";
import { db, OfflineWorkoutSession } from "@/utils/indexedDB";
import { createClient } from "@/utils/supabase/client";
import { displayWeight, kgToLbs, lbsToKg } from "@/utils/units";
import {
  Button,
  Form,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Spinner,
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

// 1. First, update your SessionExercise interface (add | null)
interface SessionExercise {
  id: string;
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  actualSets: {
    setNumber: number;
    reps: number | null; // Allow null for empty state
    weight: number | null; // Allow null for empty state
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

  const { activeSession, startSession, updateSessionProgress, endSession } =
    useSession();

  const [user, setUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Add this near your other hooks
  const { useMetric, isLoading: loadingPreferences } = useUnitPreference();

  // Add these state variables with your other state declarations
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // 1. Add custom exercise error state
  const [customExerciseError, setCustomExerciseError] = useState<string | null>(
    null
  );

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          setAuthError(error.message);
          return;
        }

        if (!user) {
          setAuthError("Not authenticated");
          return;
        }

        setUser(user);
      } catch (error: any) {
        console.error("Error fetching user:", error);
        setAuthError("Authentication failed");
      }
    };

    fetchUser();
  }, []);

  // Start session when page loads
  useEffect(() => {
    if (!activeSession && workout && user) {
      setSessionStartTime(new Date().toISOString());
      startSession({
        user_id: user.id,
        workout_id: workoutId,
        workout_name: workout.name,
        started_at: sessionStartTime!,
      });
    }
  }, [workout, user, activeSession]);

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
    toast.success(`${exercise.name} added to workout`); // Add success toast
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
        toast.error("Failed to fetch workout details"); // Add toast notification
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [workoutId]);

  // Modify your exercise initialization effect
  useEffect(() => {
    if (workoutExercises.length > 0) {
      // Check for existing progress
      if (activeSession?.progress?.exercises) {
        setSessionExercises(activeSession.progress.exercises);
      } else {
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
    }
  }, [workoutExercises, activeSession]);

  // 2. Update the handleCustomExerciseSubmit function to check for duplicates
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

      // Check if any exercise with this name already exists
      const { data: existingExercises, error: searchError } = await supabase
        .from("exercises")
        .select("id, name")
        .ilike("name", exerciseName as string);

      if (searchError) {
        toast.dismiss(toastId);
        toast.error("Failed to check for existing exercises");
        console.error("Error checking for existing exercises:", searchError);
        return;
      }

      if (existingExercises && existingExercises.length > 0) {
        toast.dismiss(toastId);
        toast.error("An exercise with this name already exists");
        setCustomExerciseError("An exercise with this name already exists");
        return;
      }

      // Continue with exercise creation
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

      // Success toast
      toast.dismiss(toastId);
      toast.success(`${insertedExercise.name} added to your exercise library!`);

      // Add exercise to workout
      handleAddExercise({
        id: insertedExercise.id,
        name: insertedExercise.name,
        category_id: insertedExercise.category_id,
        description: insertedExercise.description,
        is_default: insertedExercise.is_default,
      });

      onCustomClose();
      fetchExercises(currentPage);
    } catch (error: any) {
      console.error("Error:", error.message);
      toast.error(`Error: ${error.message || "Failed to add exercise"}`);
    }
  };

  const onSessionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const endTime = new Date().toISOString();

    // End the global session
    endSession();

    if (isOnline) {
      setSubmitted(true);
      try {
        // Add loading toast
        const toastId = toast.loading("Saving workout session...");

        if (!user) {
          toast.dismiss(toastId);
          toast.error("Not authenticated. Please sign in again.");
          throw new Error("Not authenticated");
        }

        const { data: session, error: sessionError } = await supabase
          .from("sessions")
          .insert({
            user_id: user.id,
            workout_id: workoutId,
            started_at: sessionStartTime,
            ended_at: endTime,
          })
          .select()
          .single();

        if (sessionError || !session) {
          toast.dismiss(toastId);
          toast.error("Failed to save workout session");
          throw new Error("Failed to create session");
        }

        const sessionExercisesData = sessionExercises.flatMap((exercise) =>
          exercise.actualSets
            .filter((set) => set.completed)
            .map((set) => ({
              user_id: user.id,
              session_id: session.id,
              exercise_id: exercise.id,
              set_number: set.setNumber,
              reps: set.reps ?? 0,
              weight: set.weight ?? 0,
            }))
        );

        const { error: exercisesError } = await supabase
          .from("session_exercises")
          .insert(sessionExercisesData);

        if (exercisesError) {
          toast.dismiss(toastId);
          toast.error("Failed to save exercise data");
          console.error("Exercise insertion error:", exercisesError);
          throw new Error("Failed to save session exercises");
        }

        // Success toast
        toast.dismiss(toastId);
        toast.success("Workout completed successfully!");

        router.push(`/protected/sessions/${session.id}`);
      } catch (error: any) {
        console.error("Error completing session:", error);
        toast.error(`Error: ${error.message || "Failed to save workout"}`);
        setSubmitted(false);
      }
    } else {
      // For offline storage
      try {
        const toastId = toast.loading("Saving workout offline...");

        const offlineSession: OfflineWorkoutSession = {
          workout_id: workoutId,
          started_at: sessionStartTime!,
          ended_at: endTime,
          exercises: sessionExercises.map((exercise) => ({
            exercise_id: exercise.id,
            sets: exercise.actualSets.map((set) => ({
              reps: set.reps ?? 0,
              weight: set.weight ?? 0,
              completed: set.completed,
            })),
          })),
          synced: false,
        };

        await db.saveWorkoutSession(offlineSession);

        toast.dismiss(toastId);
        toast.success("Workout saved offline. Will sync when online.");

        // Navigate back to workout page
        router.push("/protected/workouts");
      } catch (error: any) {
        toast.error(`Error saving offline: ${error.message}`);
      }
    }

    localStorage.removeItem(TIMER_STORAGE_KEY);
  };

  // Add this function with the other handlers
  const handleDeleteExercise = (exerciseIndex: number) => {
    const exerciseName = sessionExercises[exerciseIndex].name;
    setSessionExercises((prev) =>
      prev.filter((_, index) => index !== exerciseIndex)
    );
    toast.success(`${exerciseName} removed from workout`);
  };

  // Add this to your component
  useEffect(() => {
    if (activeSession && sessionExercises.length > 0) {
      // Update session with current progress
      updateSessionProgress(sessionExercises);
    }
  }, [sessionExercises]);

  // Add this function to your component
  const handleOpenModal = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setCurrentPage(1); // Reset to first page
    onOpen();
  };

  if (authError) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-bold text-red-500">Authentication Error</h2>
        <p className="mt-2">{authError}</p>
        <Button
          color="primary"
          className="mt-4"
          onPress={() => router.push("/login")}
        >
          Go to Login
        </Button>
      </div>
    );
  }

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
    <div className="w-full px-2 pb-16 max-w-full overflow-x-hidden">
      <PageTitle title={workout.name} />
      <div className="flex items-center">
        <BackButton url="/protected/workouts" />
      </div>

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
        className="w-full max-w-full justify-center items-center space-y-4"
        validationBehavior="native"
        onReset={() => setSubmitted(null)}
        onSubmit={onSessionSubmit}
      >
        <div className="flex flex-col gap-4 w-full">
          {/* Modal for Selecting Exercises - Updated */}
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
                        label="Category" // Add this line to provide a visible label
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

                    {/* Rest of your table content */}
                    <Table aria-label="Available Exercises">
                      {/* ... existing table code ... */}
                    </Table>
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

          {/* Modal for Adding Custom Exercise - Updated */}
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
                        }
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
                    {customExerciseError && (
                      <div className="text-red-500 mt-2">
                        {customExerciseError}
                      </div>
                    )}
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
                className="mb-8 bg-white p-3 sm:p-4 rounded-lg shadow w-full overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                  <h3 className="text-xl font-bold break-words">
                    {exercise.name}
                  </h3>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div className="text-sm text-gray-600">
                      Target: {exercise.targetSets} sets × {exercise.targetReps}{" "}
                      reps @ {displayWeight(exercise.targetWeight, useMetric)}
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

                <div className="w-full overflow-x-auto -mx-1 px-1">
                  <Table
                    aria-label={`${exercise.name} sets`}
                    classNames={{
                      wrapper: "min-w-full",
                      table: "min-w-full",
                    }}
                  >
                    <TableHeader>
                      <TableColumn className="w-[80px] min-w-[80px]">
                        SET
                      </TableColumn>
                      <TableColumn className="w-[120px] min-w-[120px]">
                        REPS
                      </TableColumn>
                      <TableColumn className="w-[140px] min-w-[140px]">
                        WEIGHT ({useMetric ? "KG" : "LBS"})
                      </TableColumn>
                      <TableColumn className="w-[130px] min-w-[130px]">
                        STATUS
                      </TableColumn>
                    </TableHeader>
                    <TableBody>
                      {exercise.actualSets.map((set, setIndex) => (
                        <TableRow key={setIndex}>
                          <TableCell className="text-center">
                            {set.setNumber}
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              type="text" // Changed from number to text
                              inputMode="numeric"
                              pattern="[0-9]*"
                              // Use empty string for display if value is null
                              value={set.reps === null ? "" : String(set.reps)}
                              size="md"
                              classNames={{
                                base: "min-w-[80px] w-[80px]",
                                input: "text-center px-0",
                                innerWrapper: "h-9",
                              }}
                              onChange={(e) => {
                                const inputValue = e.target.value;

                                // Important: Allow EMPTY input by updating state with null
                                if (inputValue === "") {
                                  const newExercises = [...sessionExercises];
                                  newExercises[exerciseIndex].actualSets[
                                    setIndex
                                  ].reps = null;
                                  setSessionExercises(newExercises);
                                  return;
                                }

                                // Only allow digits
                                if (!/^\d+$/.test(inputValue)) {
                                  return;
                                }

                                const newValue = parseInt(inputValue);
                                const newExercises = [...sessionExercises];
                                newExercises[exerciseIndex].actualSets[
                                  setIndex
                                ].reps = newValue;
                                setSessionExercises(newExercises);
                              }}
                              onBlur={(e) => {
                                // When focus leaves, ensure valid value (min 0)
                                const newValue = parseInt(e.target.value) || 0;
                                const newExercises = [...sessionExercises];
                                newExercises[exerciseIndex].actualSets[
                                  setIndex
                                ].reps = newValue;
                                setSessionExercises(newExercises);
                              }}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              type="text" // Changed from number to text
                              inputMode="numeric"
                              pattern="[0-9.]*" // Allow decimal points
                              // Format the value properly
                              value={
                                set.weight === null
                                  ? ""
                                  : useMetric
                                    ? Number(set.weight).toFixed(1)
                                    : kgToLbs(set.weight).toFixed(1)
                              }
                              size="md"
                              classNames={{
                                base: "min-w-[90px] max-w-[90px]",
                                input: "text-center",
                                innerWrapper: "h-9",
                              }}
                              onChange={(e) => {
                                const inputValue = e.target.value;

                                // Always allow empty input
                                if (inputValue === "") {
                                  const newExercises = [...sessionExercises];
                                  newExercises[exerciseIndex].actualSets[
                                    setIndex
                                  ].weight = null;
                                  setSessionExercises(newExercises);
                                  return;
                                }

                                // Allow digits and at most one decimal point
                                if (!/^\d*\.?\d*$/.test(inputValue)) {
                                  return;
                                }

                                // For now store the parsed number directly
                                const numValue = Number(inputValue);
                                const newExercises = [...sessionExercises];
                                newExercises[exerciseIndex].actualSets[
                                  setIndex
                                ].weight = numValue;
                                setSessionExercises(newExercises);
                              }}
                              onBlur={(e) => {
                                const inputValue = e.target.value;

                                // If empty, set to 0
                                if (inputValue === "") {
                                  const newExercises = [...sessionExercises];
                                  newExercises[exerciseIndex].actualSets[
                                    setIndex
                                  ].weight = 0;
                                  setSessionExercises(newExercises);
                                  return;
                                }

                                // Otherwise parse and convert
                                const numValue = Number(inputValue) || 0;
                                const storageValue = useMetric
                                  ? numValue
                                  : lbsToKg(numValue);

                                const newExercises = [...sessionExercises];
                                newExercises[exerciseIndex].actualSets[
                                  setIndex
                                ].weight = storageValue;
                                setSessionExercises(newExercises);
                              }}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Button
                              color={set.completed ? "success" : "primary"}
                              size="sm"
                              className="w-full min-w-[110px]"
                              onPress={() => {
                                const newExercises = [...sessionExercises];
                                const wasCompleted =
                                  newExercises[exerciseIndex].actualSets[
                                    setIndex
                                  ].completed;
                                newExercises[exerciseIndex].actualSets[
                                  setIndex
                                ].completed = !wasCompleted;
                                setSessionExercises(newExercises);

                                // Only show toast when marking as complete (not when unmarking)
                                if (!wasCompleted) {
                                  toast.success(
                                    `Set ${set.setNumber} completed!`
                                  );
                                }
                              }}
                            >
                              {set.completed ? "Completed" : "Mark Complete"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    onPress={() => {
                      const newExercises = [...sessionExercises];
                      const newSetNumber = exercise.actualSets.length + 1;
                      newExercises[exerciseIndex].actualSets.push({
                        setNumber: newSetNumber,
                        reps: 0,
                        weight: 0,
                        completed: false,
                      });
                      setSessionExercises(newExercises);
                      toast.info(
                        `Set ${newSetNumber} added to ${exercise.name}`
                      );
                    }}
                  >
                    Add Set
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button
                color="primary"
                className="w-full sm:w-auto"
                onPress={handleOpenModal} // Change from onOpen to handleOpenModal
              >
                Add Exercise
              </Button>
              <Button
                color="secondary"
                className="w-full sm:w-auto"
                onPress={onCustomOpen}
              >
                Add Custom Exercise
              </Button>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button
                color="success"
                size="lg"
                type="submit"
                className="w-full"
              >
                Complete Workout
              </Button>

              <Button
                color="danger"
                size="lg"
                variant="flat"
                className="w-full"
                onPress={() => {
                  if (
                    confirm(
                      "Are you sure you want to cancel this workout? Progress will be lost."
                    )
                  ) {
                    toast.info("Workout cancelled");

                    // Clear timer storage
                    localStorage.removeItem(TIMER_STORAGE_KEY);

                    // End the session context
                    endSession();

                    // Navigate back to workout library
                    router.push("/protected/workouts");
                  }
                }}
              >
                Cancel Workout
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
    </div>
  );
}
