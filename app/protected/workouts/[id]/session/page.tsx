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
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  useDisclosure,
} from "@nextui-org/react";
import {
  Check,
  ExternalLink,
  FileText,
  Plus,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
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
    .order("exercise_order", { ascending: true }); // Add this line to ensure correct order

  if (error) throw error;

  // Transform the data to match the expected format
  const transformedExercises = workoutExercises.map((we: any) => ({
    id: we.exercise.id,
    name: we.exercise.name,
    sets: we.sets,
    reps: we.reps,
    weight: we.weight,
    exercise_order: we.exercise_order, // Include this field
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

  // Add these state variables with your other useDisclosure hooks
  const {
    isOpen: isCancelConfirmOpen,
    onOpen: onCancelConfirmOpen,
    onClose: onCancelConfirmClose,
  } = useDisclosure();

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
    <div className="w-full max-w-full overflow-x-hidden px-4">
      <PageTitle title="Workout Session" />

      <div className="flex items-center mb-4">
        <BackButton url={`/protected/workouts/${workoutId}`} />
      </div>

      {/* Workout heading */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold">{workout.name}</h2>
        <div className="flex gap-2">
          <Timer />
        </div>
      </div>

      {/* Workout description card */}
      <div className="bg-default-50 dark:bg-default-100 p-4 rounded-lg mb-6 border border-default-200">
        <h3 className="font-semibold mb-2">Description</h3>
        <p>{workout.description || "No description provided."}</p>
        <p className="text-sm text-gray-500 mt-2" suppressHydrationWarning>
          Session started: {new Date(sessionStartTime || "").toLocaleString()}
        </p>
      </div>

      {!isOnline && (
        <div className="bg-yellow-100 text-yellow-800 p-4 rounded-lg mb-6 border border-yellow-200">
          <div className="flex items-center gap-2">
            <WifiOff className="h-5 w-5" />
            <p className="font-medium">
              You're offline. Your workout will be saved locally and synced when
              back online.
            </p>
          </div>
        </div>
      )}

      <Form
        className="w-full max-w-full justify-center items-center space-y-4"
        validationBehavior="native"
        onReset={() => setSubmitted(null)}
        onSubmit={onSessionSubmit}
      >
        <div className="flex flex-col gap-6 w-full">
          {/* Exercise cards */}
          {sessionExercises.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <div className="flex flex-col items-center gap-3 text-gray-500">
                <FileText className="h-10 w-10" />
                <p>No exercises added to this session</p>
                <Button size="sm" color="primary" onPress={handleOpenModal}>
                  Add Your First Exercise
                </Button>
              </div>
            </div>
          ) : (
            sessionExercises.map((exercise, exerciseIndex) => (
              <div
                key={exercise.id}
                className="bg-default-50 dark:bg-default-100 p-4 rounded-lg shadow-sm border border-default-200"
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
                      variant="light"
                      startContent={<Trash2 className="h-4 w-4" />}
                      onPress={() => handleDeleteExercise(exerciseIndex)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                <div className="w-full overflow-x-auto -mx-2 px-2">
                  <Table
                    aria-label={`${exercise.name} sets`}
                    classNames={{
                      base: "min-w-full",
                      table: "min-w-full",
                    }}
                  >
                    <TableHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900">
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
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={set.reps === null ? "" : String(set.reps)}
                              size="md"
                              classNames={{
                                base: "min-w-[80px] w-[80px]",
                                input: "text-center px-0",
                                innerWrapper: "h-9",
                              }}
                              onChange={(e) => {
                                const inputValue = e.target.value;

                                if (inputValue === "") {
                                  const newExercises = [...sessionExercises];
                                  newExercises[exerciseIndex].actualSets[
                                    setIndex
                                  ].reps = null;
                                  setSessionExercises(newExercises);
                                  return;
                                }

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
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9.]*"
                              value={
                                set.weight === null
                                  ? ""
                                  : useMetric
                                    ? Number(set.weight).toFixed(1)
                                    : kgToLbs(set.weight).toFixed(1)
                              }
                              size="md"
                              classNames={{
                                base: "min-w-[90px] w-[90px]",
                                input: "text-center px-0",
                                innerWrapper: "h-9",
                              }}
                              onChange={(e) => {
                                const inputValue = e.target.value;

                                if (inputValue === "") {
                                  const newExercises = [...sessionExercises];
                                  newExercises[exerciseIndex].actualSets[
                                    setIndex
                                  ].weight = null;
                                  setSessionExercises(newExercises);
                                  return;
                                }

                                if (!/^\d*\.?\d*$/.test(inputValue)) {
                                  return;
                                }

                                const numValue = Number(inputValue);
                                const newExercises = [...sessionExercises];
                                newExercises[exerciseIndex].actualSets[
                                  setIndex
                                ].weight = numValue;
                                setSessionExercises(newExercises);
                              }}
                              onBlur={(e) => {
                                const inputValue = e.target.value;

                                if (inputValue === "") {
                                  const newExercises = [...sessionExercises];
                                  newExercises[exerciseIndex].actualSets[
                                    setIndex
                                  ].weight = 0;
                                  setSessionExercises(newExercises);
                                  return;
                                }

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
                          <TableCell className="p-2 flex gap-1">
                            <Button
                              color={set.completed ? "success" : "primary"}
                              size="sm"
                              className="flex-1 min-w-[80px]"
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

                                if (!wasCompleted) {
                                  toast.success(
                                    `Set ${set.setNumber} completed!`
                                  );
                                }
                              }}
                            >
                              {set.completed ? "Completed" : "Mark Complete"}
                            </Button>

                            {/* Add this remove button */}
                            <Button
                              isIconOnly
                              color="danger"
                              variant="light"
                              size="sm"
                              onPress={() => {
                                // Don't allow removing if it's the only set
                                if (exercise.actualSets.length <= 1) {
                                  toast.error("Cannot remove the only set");
                                  return;
                                }

                                // Create new exercises array
                                const newExercises = [...sessionExercises];

                                // Remove the set at the specified index
                                newExercises[exerciseIndex].actualSets.splice(
                                  setIndex,
                                  1
                                );

                                // Renumber the remaining sets
                                newExercises[exerciseIndex].actualSets =
                                  newExercises[exerciseIndex].actualSets.map(
                                    (set, idx) => ({
                                      ...set,
                                      setNumber: idx + 1,
                                    })
                                  );

                                // Update state
                                setSessionExercises(newExercises);

                                // Show confirmation toast
                                toast.success(
                                  `Set removed from ${exercise.name}`
                                );
                              }}
                              className={
                                exercise.actualSets.length <= 1
                                  ? "opacity-50"
                                  : ""
                              }
                              isDisabled={exercise.actualSets.length <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4">
                  <Button
                    size="sm"
                    variant="flat"
                    startContent={<Plus className="h-4 w-4" />}
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
            ))
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Button
              color="primary"
              className="w-full sm:w-auto"
              startContent={<Plus className="h-4 w-4" />}
              onPress={handleOpenModal}
              type="button"
            >
              Add Exercise
            </Button>
            <Button
              color="secondary"
              className="w-full sm:w-auto"
              startContent={<ExternalLink className="h-4 w-4" />}
              onPress={onCustomOpen}
              type="button"
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
              startContent={<Check className="h-4 w-4" />}
            >
              Complete Workout
            </Button>

            <Button
              color="danger"
              size="lg"
              variant="flat"
              className="w-full"
              startContent={<X className="h-4 w-4" />}
              onPress={onCancelConfirmOpen} // Open the modal instead of showing native confirm
            >
              Cancel Workout
            </Button>
          </div>
        </div>
      </Form>

      {/* Add this modal at the end of your component, before the closing return tag */}
      <Modal
        backdrop="opaque"
        isOpen={isCancelConfirmOpen}
        onClose={onCancelConfirmClose}
        className="dark:bg-gray-900"
        placement="center"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Cancel Workout
              </ModalHeader>
              <ModalBody>
                <p>
                  Are you sure you want to cancel this workout? Progress will be
                  lost.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Keep Working
                </Button>
                <Button
                  color="danger"
                  onPress={() => {
                    toast.info("Workout cancelled");
                    localStorage.removeItem(TIMER_STORAGE_KEY);
                    endSession();
                    router.push("/protected/workouts");
                    onClose();
                  }}
                >
                  Yes, Cancel Workout
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
