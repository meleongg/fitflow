"use client";

import BackButton from "@/components/ui/back-button";
import PageTitle from "@/components/ui/page-title";
import SessionDuration from "@/components/ui/session-duration";
import { useSession } from "@/contexts/SessionContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useUnitPreference } from "@/hooks/useUnitPreference";
import { createClient } from "@/utils/supabase/client";
import {
  convertFromStorageUnit,
  convertToStorageUnit,
  displayWeight,
  kgToLbs,
  lbsToKg,
} from "@/utils/units";
import {
  Button,
  Checkbox,
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
  Skeleton,
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
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronUp,
  Clock,
  Dumbbell,
  FileText,
  Plus,
  Search,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

interface SessionExercise {
  id: string;
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  actualSets: {
    setNumber: number;
    reps: number | null;
    weight: number | null;
    completed: boolean;
  }[];
}

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
  // Add your new state variables here, before any useEffects or other logic
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUpdateWorkoutModal, setShowUpdateWorkoutModal] = useState(false);
  const [workoutUpdates, setWorkoutUpdates] = useState<{
    [exerciseId: string]: {
      sets: number;
      reps: number;
      weight: number;
      selected: boolean;
      isPR: boolean;
      manuallyEdited: boolean;
    };
  }>({});
  const [showIncompleteExercisesModal, setShowIncompleteExercisesModal] =
    useState(false);
  const [incompleteExercisesNames, setIncompleteExercisesNames] =
    useState<string>("");

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

  const { useMetric, isLoading: loadingPreferences } = useUnitPreference();

  // Add these state variables with your other state declarations
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [customExerciseError, setCustomExerciseError] = useState<string | null>(
    null
  );

  // Add these state variables with your other useDisclosure hooks
  const {
    isOpen: isCancelConfirmOpen,
    onOpen: onCancelConfirmOpen,
    onClose: onCancelConfirmClose,
  } = useDisclosure();

  // Add this state at the top of your component with your other states
  const [editingWeights, setEditingWeights] = useState<{
    [key: string]: string;
  }>({});

  // Add these state variables to track loading states
  const [addingExercise, setAddingExercise] = useState<string | null>(null);
  const [removingExercise, setRemovingExercise] = useState<string | null>(null);
  const [addingSet, setAddingSet] = useState<string | null>(null);
  const [removingSet, setRemovingSet] = useState<{
    exerciseId: string;
    setIndex: number;
  } | null>(null);
  const [completingWorkout, setCompletingWorkout] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Add to your component
  const scrollHeaderRef = useRef<HTMLDivElement>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollHeaderRef.current) {
        setIsHeaderVisible(window.scrollY > 300);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      // Create the timestamp once and use it in both places
      const timestamp = new Date().toISOString();

      // Set state for display purposes
      setSessionStartTime(timestamp);

      console.log(
        "Starting session with timestamp: from session page",
        timestamp
      );

      // Use the same timestamp directly in the startSession call
      startSession({
        user_id: user.id,
        workout_id: workoutId,
        workout_name: workout.name,
        started_at: timestamp, // Use direct value instead of state
      });
    }
  }, [workout, user, activeSession, workoutId, startSession]);

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

      // Add exercise directly to the current workout session
      const newSessionExercise = {
        id: insertedExercise.id,
        name: insertedExercise.name,
        targetSets: 3,
        targetReps: 10,
        targetWeight: 0,
        actualSets: Array.from({ length: 3 }, (_, i) => ({
          setNumber: i + 1,
          reps: 0,
          weight: 0,
          completed: false,
        })),
      };

      setSessionExercises((prev) => [...prev, newSessionExercise]);

      // Close the modal and refresh exercise list
      onCustomClose();
      fetchExercises(currentPage);
    } catch (error: any) {
      console.error("Error:", error.message);
      toast.error(`Error: ${error.message || "Failed to add exercise"}`);
    }
  };

  // Modify the onSessionSubmit function to prepare workout updates
  const onSessionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Check if any sets are completed
    const hasCompletedSets = sessionExercises.some((exercise) =>
      exercise.actualSets.some((set) => set.completed)
    );

    if (!hasCompletedSets) {
      toast.error(
        "Please complete at least one set before finishing the workout"
      );
      setCompletingWorkout(false);
      return;
    }

    // Check if any exercises have no completed sets at all
    const incompleteExercises = sessionExercises.filter(
      (exercise) => !exercise.actualSets.some((set) => set.completed)
    );

    if (incompleteExercises.length > 0) {
      const exerciseNames = incompleteExercises.map((e) => e.name).join(", ");

      // Show modal instead of native confirm
      setIncompleteExercisesNames(exerciseNames);
      setShowIncompleteExercisesModal(true);
      setCompletingWorkout(false);
      return;
    }

    // Continue with existing code...
    const endTime = new Date().toISOString();

    const updates: {
      [exerciseId: string]: {
        sets: number;
        reps: number;
        weight: number;
        selected: boolean;
        isPR: boolean;
        manuallyEdited: boolean;
      };
    } = {};

    // Track if we have any updates to suggest
    let hasUpdatesToSuggest = false;

    const { data: existingPRs } = await supabase
      .from("analytics")
      .select("exercise_id, max_weight")
      .eq("user_id", user.id);

    const prMap = new Map();
    existingPRs?.forEach((pr) => {
      prMap.set(`${pr.exercise_id}`, pr.max_weight || 0);
    });

    // Calculate suggested updates with better PR detection
    sessionExercises.forEach((exercise) => {
      const completedSets = exercise.actualSets.filter((set) => set.completed);
      if (completedSets.length > 0) {
        // Get the best metrics from completed sets
        const bestWeight = Math.max(
          ...completedSets.map((set) => set.weight || 0)
        );
        const bestReps = Math.max(...completedSets.map((set) => set.reps || 0));

        const isPR = bestWeight > (prMap.get(exercise.id) || 0);

        // Define shouldUpdate - typically we should update if there's a PR or significant change
        const shouldUpdate =
          isPR ||
          completedSets.length !== exercise.targetSets ||
          bestReps !== exercise.targetReps ||
          bestWeight > exercise.targetWeight;

        // Flag if we have any updates to suggest (used for modal display logic)
        if (shouldUpdate) {
          hasUpdatesToSuggest = true;
        }

        updates[exercise.id] = {
          sets: completedSets.length,
          reps: bestReps,
          weight: bestWeight,
          selected: shouldUpdate,
          isPR,
          manuallyEdited: false,
        };
      }
    });

    if (hasUpdatesToSuggest) {
      setWorkoutUpdates(updates);
      setShowUpdateWorkoutModal(true);
    } else {
      // If no updates to suggest, proceed with normal flow
      await finalizeSession(endTime);
    }
  };

  // Fix the finalizeSession function in your WorkoutSession component
  const finalizeSession = async (endTime: string) => {
    setIsSubmitting(true);

    try {
      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          user_id: user.id,
          workout_id: workoutId,
          started_at: sessionStartTime || new Date().toISOString(),
          ended_at: endTime,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      for (const exercise of sessionExercises) {
        // Get all completed sets for this exercise
        const completedSets = exercise.actualSets.filter(
          (set) => set.completed
        );
        if (completedSets.length === 0) continue;

        // Insert EACH completed set as a separate record
        for (const set of completedSets) {
          const { error: exerciseError } = await supabase
            .from("session_exercises")
            .insert({
              session_id: session.id,
              exercise_id: exercise.id,
              user_id: user.id,
              reps: set.reps || 0,
              weight: set.weight || 0,
              set_number: set.setNumber,
            });

          if (exerciseError) {
            console.error(
              "Error inserting session exercise set:",
              exerciseError
            );
            console.error("Error details:", JSON.stringify(exerciseError));
          }
        }
      }

      // After successful session submission
      endSession();
      console.log("endSession called from finalizeSession");
      toast.success("Session completed!");

      // Use window.location.href with replace() instead of router.push
      // This forces a FULL page reload instead of client-side navigation
      setTimeout(() => {
        window.location.replace(
          `/protected/sessions/${session.id}?ts=${Date.now()}`
        );
      }, 300);

      return true;
    } catch (error: any) {
      console.error("Error saving session:", error);
      toast.error(
        "Failed to save session: " + (error.message || "Unknown error")
      );
      setIsSubmitting(false);
      return false;
    }
  };

  // Add this function to handle workout updates
  const handleWorkoutUpdate = async () => {
    try {
      const toastId = toast.loading("Updating workout defaults...");

      // Filter selected exercises
      const selectedUpdates = Object.entries(workoutUpdates)
        .filter(([_, data]) => data.selected)
        .map(([exerciseId, data]) => ({
          exercise_id: exerciseId,
          workout_id: workoutId,
          sets: data.sets,
          reps: data.reps,
          weight: data.weight,
          isPR: data.isPR,
        }));

      if (selectedUpdates.length > 0) {
        // Update each workout exercise
        for (const update of selectedUpdates) {
          await supabase
            .from("workout_exercises")
            .update({
              sets: update.sets,
              reps: update.reps,
              weight: update.weight,
            })
            .eq("workout_id", update.workout_id)
            .eq("exercise_id", update.exercise_id);

          // If this is a PR, update the analytics table
          if (update.isPR) {
            try {
              const numericWeight = Number(update.weight) || 0;

              const { data, error: analyticsError } = await supabase
                .from("analytics")
                .upsert(
                  {
                    user_id: user.id,
                    exercise_id: update.exercise_id,
                    max_weight: numericWeight,
                    updated_at: new Date().toISOString(),
                  },
                  {
                    onConflict: "user_id,exercise_id",
                  }
                );
            } catch (err) {
              console.error("Exception in analytics update:", err);
            }
          }
        }

        toast.dismiss(toastId);
        toast.success(
          `Updated ${selectedUpdates.length} exercises in your workout`
        );
      } else {
        toast.dismiss(toastId);
        toast.info("No workout updates selected");
      }

      // Instead of trying to access session.id directly, call finalizeSession
      // which will create the session and handle the navigation
      const endTime = new Date().toISOString();
      await finalizeSession(endTime);
    } catch (error: any) {
      console.error("Error updating workout:", error);
      toast.error("Failed to update workout defaults");

      // Still finalize the session even if updates fail
      await finalizeSession(new Date().toISOString());
    }
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
  const hasUpdatedRef = useRef(false);

  useEffect(() => {
    if (isLoading || hasUpdatedRef.current) return;

    if (sessionExercises?.length > 0) {
      updateSessionProgress(sessionExercises);
      // Mark as updated so we don't repeat unnecessarily
      hasUpdatedRef.current = true;
    }
  }, [sessionExercises, isLoading, updateSessionProgress]);

  // Add this function to your component
  const handleOpenModal = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setCurrentPage(1); // Reset to first page
    onOpen();
  };

  // Add this function to your component
  const handleSetCompletion = (exerciseIndex: number, setIndex: number) => {
    const newExercises = [...sessionExercises];
    const currentSet = newExercises[exerciseIndex].actualSets[setIndex];
    const previousSets = newExercises[exerciseIndex].actualSets.filter(
      (_, idx) => idx < setIndex && !_.completed
    );

    // Check if previous sets are incomplete
    if (previousSets.length > 0 && !currentSet.completed) {
      // Show warning but allow it
      toast.warning(
        `You have ${previousSets.length} incomplete previous set(s). Consider completing in order.`
      );
    }

    // Prevent marking sets as complete if they have no data
    if (
      (currentSet.reps === 0 || currentSet.reps === null) &&
      !currentSet.completed
    ) {
      toast.error("Please enter reps before marking set as complete");
      return;
    }

    if (
      (currentSet.weight === 0 || currentSet.weight === null) &&
      !currentSet.completed
    ) {
      toast.warning("You're marking a set as complete with 0 weight");
    }

    // Toggle completion status
    newExercises[exerciseIndex].actualSets[setIndex].completed =
      !currentSet.completed;
    setSessionExercises(newExercises);

    if (!currentSet.completed) {
      toast.success(`Set ${currentSet.setNumber} completed!`);
    }
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

  // Replace your current loading skeleton section with this updated version:

  if (isLoading) {
    return (
      <div className="w-full max-w-full overflow-x-hidden px-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48 rounded-lg" /> {/* Page title */}
        </div>

        <div className="flex items-center mt-4">
          <Skeleton className="h-9 w-24 rounded-lg" /> {/* Back button */}
        </div>

        {/* Workout heading skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 my-6">
          <Skeleton className="h-8 w-64 rounded-lg" /> {/* Workout title */}
          <div className="flex gap-2 items-center">
            <Skeleton className="h-6 w-32 rounded-full" /> {/* Set stats */}
          </div>
        </div>

        {/* Progress indicator skeleton */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <Skeleton className="h-4 w-28 rounded-md" /> {/* Progress label */}
            <Skeleton className="h-4 w-12 rounded-md" />{" "}
            {/* Progress percentage */}
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />{" "}
          {/* Progress bar */}
        </div>

        {/* Workout description card skeleton */}
        <div className="bg-default-50 dark:bg-default-100 p-4 rounded-lg mb-6 border border-default-200">
          <Skeleton className="h-5 w-24 mb-2 rounded-lg" />{" "}
          {/* Description label */}
          <Skeleton className="h-16 w-full rounded-lg" />{" "}
          {/* Description text */}
          <div className="flex justify-between items-center mt-4">
            <Skeleton className="h-4 w-48 rounded-md" /> {/* Session started */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" /> {/* Clock icon */}
              <Skeleton className="h-4 w-16 rounded-md" />{" "}
              {/* Session duration */}
            </div>
          </div>
        </div>

        {/* Exercise cards skeletons */}
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-default-50 dark:bg-default-100 p-4 rounded-lg shadow-sm border border-default-200 mb-6"
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-8 w-8 rounded-lg" /> {/* Up button */}
                  <Skeleton className="h-8 w-8 rounded-lg" />{" "}
                  {/* Down button */}
                </div>
                <Skeleton className="h-7 w-48 rounded-lg" />{" "}
                {/* Exercise name */}
                {/* Progress indicator */}
                <div className="ml-2 flex items-center gap-2">
                  <Skeleton className="h-1.5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-10 rounded-md" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Skeleton className="h-5 w-40 rounded-md" />{" "}
                {/* Target sets/reps */}
                <Skeleton className="h-9 w-24 rounded-lg" />{" "}
                {/* Remove button */}
              </div>
            </div>

            {/* Exercise table skeleton */}
            <div className="overflow-x-auto">
              <div className="flex w-full justify-between p-2 bg-default-100 dark:bg-default-200 rounded-t-lg">
                <Skeleton className="h-6 w-20 rounded-lg" /> {/* SET */}
                <Skeleton className="h-6 w-28 rounded-lg" /> {/* REPS */}
                <Skeleton className="h-6 w-28 rounded-lg" /> {/* WEIGHT */}
                <Skeleton className="h-6 w-28 rounded-lg" /> {/* STATUS */}
              </div>
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="flex w-full justify-between items-center p-3 border-b"
                >
                  <Skeleton className="h-6 w-12 rounded-lg" />{" "}
                  {/* Set number */}
                  <Skeleton className="h-9 w-20 rounded-lg" />{" "}
                  {/* Reps input */}
                  <Skeleton className="h-9 w-24 rounded-lg" />{" "}
                  {/* Weight input */}
                  <div className="flex gap-1">
                    <Skeleton className="h-9 w-28 rounded-lg" />{" "}
                    {/* Status button */}
                    <Skeleton className="h-9 w-9 rounded-lg" />{" "}
                    {/* Remove button */}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <Skeleton className="h-9 w-28 rounded-lg" />{" "}
              {/* Add Set button */}
            </div>
          </div>
        ))}

        {/* Action buttons skeleton */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Skeleton className="h-10 w-full sm:w-40 rounded-lg" />{" "}
          {/* Add Exercise */}
          <Skeleton className="h-10 w-full sm:w-48 rounded-lg" />{" "}
          {/* Add Custom Exercise */}
        </div>

        {/* Bottom sticky actions */}
        <div className="mt-8 mb-16">
          <div className="w-full bg-background/80 backdrop-blur-md p-4 rounded-lg shadow-lg border">
            <div className="flex flex-col sm:flex-row gap-3">
              <Skeleton className="h-12 w-full rounded-lg" />{" "}
              {/* Complete button */}
              <Skeleton className="h-12 w-full rounded-lg" />{" "}
              {/* Cancel button */}
            </div>
          </div>
        </div>
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

      {/* Add this floating header before the Form element */}
      <div
        ref={scrollHeaderRef}
        className={`fixed top-0 left-0 right-0 bg-background/80 backdrop-blur-md z-50 transition-all duration-300 shadow-md border-b ${
          isHeaderVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="container max-w-6xl mx-auto px-4 py-2 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="light"
              isIconOnly
              onPress={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <span className="font-semibold truncate max-w-[200px]">
              {workout?.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm">
              {sessionExercises.reduce(
                (acc, ex) =>
                  acc + ex.actualSets.filter((set) => set.completed).length,
                0
              )}
              /
              {sessionExercises.reduce(
                (acc, ex) => acc + ex.actualSets.length,
                0
              )}{" "}
              sets
            </div>
            <SessionDuration />
          </div>
        </div>
      </div>

      <Form
        ref={formRef}
        className="w-full max-w-full justify-center items-center space-y-4"
        validationBehavior="native"
        onReset={() => setSubmitted(null)}
        onSubmit={onSessionSubmit}
      >
        <div className="flex flex-col gap-6 w-full">
          {/* Workout heading */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold">{workout.name}</h2>
            <div className="flex gap-2 items-center">
              {/* Session stats instead of a duplicate timer */}
              <div className="text-sm bg-default-100 px-3 py-1 rounded-full">
                <span className="font-medium">
                  {sessionExercises.reduce(
                    (acc, ex) =>
                      acc + ex.actualSets.filter((set) => set.completed).length,
                    0
                  )}
                  /
                  {sessionExercises.reduce(
                    (acc, ex) => acc + ex.actualSets.length,
                    0
                  )}
                </span>{" "}
                sets completed
              </div>
            </div>
          </div>

          {/* Add this progress indicator above the exercise cards */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">Overall progress</span>
              <span className="text-sm font-semibold">
                {Math.round(
                  (sessionExercises.reduce(
                    (acc, ex) =>
                      acc + ex.actualSets.filter((set) => set.completed).length,
                    0
                  ) /
                    Math.max(
                      1,
                      sessionExercises.reduce(
                        (acc, ex) => acc + ex.actualSets.length,
                        0
                      )
                    )) *
                    100
                )}
                %
              </span>
            </div>
            <div className="w-full bg-default-200 rounded-full h-2.5 dark:bg-gray-700">
              <div
                className="bg-primary h-2.5 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    (sessionExercises.reduce(
                      (acc, ex) =>
                        acc +
                        ex.actualSets.filter((set) => set.completed).length,
                      0
                    ) /
                      Math.max(
                        1,
                        sessionExercises.reduce(
                          (acc, ex) => acc + ex.actualSets.length,
                          0
                        )
                      )) *
                    100
                  }%`,
                }}
              ></div>
            </div>
          </div>

          {/* Workout description card */}
          <div className="bg-default-50 dark:bg-default-100 p-4 rounded-lg mb-6 border border-default-200">
            <h3 className="font-semibold mb-2">Description</h3>
            <p>{workout.description || "No description provided."}</p>

            <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
              <div>
                Session started:{" "}
                {new Date(sessionStartTime || "").toLocaleString()}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <SessionDuration />
              </div>
            </div>
          </div>

          {!isOnline && (
            <div className="bg-yellow-100 text-yellow-800 p-4 rounded-lg mb-6 border border-yellow-200">
              <div className="flex items-center gap-2">
                <WifiOff className="h-5 w-5" />
                <p className="font-medium">
                  You're offline. Your workout will be saved locally and synced
                  when back online.
                </p>
              </div>
            </div>
          )}

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
                className="bg-default-50 dark:bg-default-100 p-4 rounded-lg shadow-sm border border-default-200 transition-all duration-300 hover:shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    {/* Add reorder buttons */}
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        isIconOnly
                        variant="light"
                        isDisabled={exerciseIndex === 0}
                        onPress={() => {
                          setSessionExercises((prev) => {
                            const newExercises = [...prev];
                            if (exerciseIndex > 0) {
                              // Swap with previous exercise
                              [
                                newExercises[exerciseIndex],
                                newExercises[exerciseIndex - 1],
                              ] = [
                                newExercises[exerciseIndex - 1],
                                newExercises[exerciseIndex],
                              ];
                            }
                            return newExercises;
                          });
                          if (exerciseIndex > 0) {
                            toast.success(`${exercise.name} moved up`);
                          }
                        }}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        isIconOnly
                        variant="light"
                        isDisabled={
                          exerciseIndex === sessionExercises.length - 1
                        }
                        onPress={() => {
                          setSessionExercises((prev) => {
                            const newExercises = [...prev];
                            if (exerciseIndex < newExercises.length - 1) {
                              // Swap with next exercise
                              [
                                newExercises[exerciseIndex],
                                newExercises[exerciseIndex + 1],
                              ] = [
                                newExercises[exerciseIndex + 1],
                                newExercises[exerciseIndex],
                              ];
                            }
                            return newExercises;
                          });
                          if (exerciseIndex < sessionExercises.length - 1) {
                            toast.success(`${exercise.name} moved down`);
                          }
                        }}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Exercise name */}
                    <h3 className="text-xl font-bold break-words">
                      {exercise.name}
                    </h3>

                    <div className="ml-2 flex items-center gap-2">
                      <div className="w-16 bg-default-200 rounded-full h-1.5 dark:bg-gray-700">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all duration-300"
                          style={{
                            width: `${
                              (exercise.actualSets.filter(
                                (set) => set.completed
                              ).length /
                                Math.max(1, exercise.actualSets.length)) *
                              100
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {
                          exercise.actualSets.filter((set) => set.completed)
                            .length
                        }
                        /{exercise.actualSets.length}
                      </span>
                    </div>
                  </div>

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
                      isLoading={removingExercise === exercise.id}
                      onPress={() => {
                        setRemovingExercise(exercise.id);

                        // Add a small delay to show the loading state
                        setTimeout(() => {
                          handleDeleteExercise(exerciseIndex);
                          setRemovingExercise(null);
                        }, 300);
                      }}
                    >
                      {removingExercise === exercise.id
                        ? "Removing..."
                        : "Remove"}
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
                                base: "min-w-[80px] w-[80px] transition-all duration-200",
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
                              inputMode="decimal"
                              pattern="[0-9]*\.?[0-9]*"
                              // Show editing value while actively editing, otherwise show converted display value
                              value={
                                // If we're currently editing this specific input
                                `${exerciseIndex}-${setIndex}` in editingWeights
                                  ? editingWeights[
                                      `${exerciseIndex}-${setIndex}`
                                    ]
                                  : // Otherwise show the proper converted value based on user preference
                                    set.weight === null
                                    ? ""
                                    : useMetric
                                      ? Number(set.weight).toFixed(1)
                                      : kgToLbs(set.weight).toFixed(1)
                              }
                              size="md"
                              classNames={{
                                base: "min-w-[90px] w-[90px] transition-all duration-200",
                                input: "text-center px-0",
                                innerWrapper: "h-9",
                                inputWrapper: set.completed
                                  ? "bg-success/10 border-success"
                                  : "",
                              }}
                              onFocus={(e) => {
                                // When focusing, initialize editing state with current display value
                                const displayValue =
                                  set.weight === null
                                    ? ""
                                    : useMetric
                                      ? Number(set.weight).toFixed(1)
                                      : kgToLbs(set.weight).toFixed(1);

                                setEditingWeights({
                                  ...editingWeights,
                                  [`${exerciseIndex}-${setIndex}`]:
                                    displayValue,
                                });
                              }}
                              onChange={(e) => {
                                const inputValue = e.target.value;

                                // Allow empty input
                                if (inputValue === "") {
                                  setEditingWeights({
                                    ...editingWeights,
                                    [`${exerciseIndex}-${setIndex}`]: "",
                                  });
                                  return;
                                }

                                // Allow any input that could be a valid decimal number
                                if (/^\d*\.?\d*$/.test(inputValue)) {
                                  // Store exactly what the user types during editing
                                  setEditingWeights({
                                    ...editingWeights,
                                    [`${exerciseIndex}-${setIndex}`]:
                                      inputValue,
                                  });
                                }
                              }}
                              onBlur={(e) => {
                                const inputValue = e.target.value;

                                // Handle special case of just a decimal point
                                if (inputValue === "." || inputValue === "") {
                                  const newExercises = [...sessionExercises];
                                  newExercises[exerciseIndex].actualSets[
                                    setIndex
                                  ].weight = 0;
                                  setSessionExercises(newExercises);

                                  // Clear editing state
                                  const newEditingWeights = {
                                    ...editingWeights,
                                  };
                                  delete newEditingWeights[
                                    `${exerciseIndex}-${setIndex}`
                                  ];
                                  setEditingWeights(newEditingWeights);
                                  return;
                                }

                                // Parse value and convert to kg for storage if needed
                                const numValue = parseFloat(inputValue) || 0;
                                const storageValue = useMetric
                                  ? numValue
                                  : lbsToKg(numValue);

                                // Update the actual exercise data
                                const newExercises = [...sessionExercises];
                                newExercises[exerciseIndex].actualSets[
                                  setIndex
                                ].weight = storageValue;
                                setSessionExercises(newExercises);

                                // Clear editing state
                                const newEditingWeights = { ...editingWeights };
                                delete newEditingWeights[
                                  `${exerciseIndex}-${setIndex}`
                                ];
                                setEditingWeights(newEditingWeights);
                              }}
                            />
                          </TableCell>
                          <TableCell className="p-2 flex gap-1">
                            <Button
                              color={set.completed ? "success" : "primary"}
                              size="sm"
                              className={`flex-1 min-w-[80px] transition-all duration-300 ${
                                set.completed
                                  ? "ring-2 ring-success ring-opacity-50"
                                  : ""
                              }`}
                              onPress={() =>
                                handleSetCompletion(exerciseIndex, setIndex)
                              }
                            >
                              {set.completed ? "Completed" : "Mark Complete"}
                            </Button>

                            {/* Add this remove button */}
                            <Button
                              isIconOnly
                              color="danger"
                              variant="light"
                              size="sm"
                              isLoading={
                                removingSet?.exerciseId === exercise.id &&
                                removingSet?.setIndex === setIndex
                              }
                              onPress={() => {
                                // Don't allow removing if it's the only set
                                if (exercise.actualSets.length <= 1) {
                                  toast.error("Cannot remove the only set");
                                  return;
                                }

                                setRemovingSet({
                                  exerciseId: exercise.id,
                                  setIndex,
                                });

                                setTimeout(() => {
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

                                  setRemovingSet(null);
                                }, 300);
                              }}
                              className={
                                exercise.actualSets.length <= 1
                                  ? "opacity-50"
                                  : ""
                              }
                              isDisabled={exercise.actualSets.length <= 1}
                            >
                              {removingSet?.exerciseId === exercise.id &&
                              removingSet?.setIndex === setIndex ? (
                                <Spinner size="sm" color="danger" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
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
                    isLoading={addingSet === exercise.id}
                    onPress={() => {
                      setAddingSet(exercise.id);

                      setTimeout(() => {
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
                        setAddingSet(null);
                      }, 300);
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
              startContent={<Dumbbell className="h-4 w-4" />} // Changed from ExternalLink to Dumbbell
              onPress={onCustomOpen}
              type="button"
            >
              Add Custom Exercise
            </Button>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 mb-16 sticky bottom-4 z-40">
            <div className="w-full bg-background/80 backdrop-blur-md p-4 rounded-lg shadow-lg border">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  color="success"
                  size="lg"
                  type="submit"
                  className="w-full"
                  isLoading={isSubmitting || completingWorkout}
                  onPress={() => {
                    setCompletingWorkout(true);
                    // Use the ref to access the form
                    if (formRef.current) {
                      formRef.current.requestSubmit();
                    }
                  }}
                  startContent={
                    !(isSubmitting || completingWorkout) && (
                      <Check className="h-5 w-5" />
                    )
                  }
                >
                  {isSubmitting || completingWorkout
                    ? "Saving..."
                    : "Complete Workout"}
                </Button>

                <Button
                  color="danger"
                  size="lg"
                  variant="flat"
                  className="w-full"
                  onPress={onCancelConfirmOpen}
                  startContent={<X className="h-5 w-5" />}
                >
                  Cancel Workout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Form>

      {/* Add this modal at the end of your component */}
      <Modal
        isOpen={showUpdateWorkoutModal}
        onClose={() => {
          setShowUpdateWorkoutModal(false);
          setTimeout(async () => {
            try {
              await finalizeSession(new Date().toISOString());
            } catch (err) {
              console.error("Session finalization failed:", err);
              toast.error("Failed to complete workout session");
              setIsSubmitting(false);
            }
          }, 100);
        }}
        size="lg"
        placement="top"
        backdrop="opaque"
        scrollBehavior="inside"
        classNames={{
          base: "max-w-[95%] sm:max-w-3xl mx-auto max-h-[80vh] sm:max-h-[80vh]", // Reduced from 90vh to 80vh
          wrapper: "items-start justify-center p-2 pt-4 mb-16", // Added mb-16 for bottom margin
          header:
            "pb-0 border-b border-default-200 sticky top-0 z-10 bg-background",
          body: "p-4 overflow-auto pb-32", // Keep existing padding
          footer:
            "pt-3 px-6 pb-5 flex flex-col sm:flex-row gap-3 justify-end sticky bottom-0 left-0 right-0 z-20 bg-background border-t border-default-200",
          closeButton: "top-3 right-3",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 pb-3">
                <h2 className="text-xl">Update Workout Defaults</h2>
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-500 mb-5">
                  Would you like to update your workout defaults based on
                  today's performance? Select the exercises you want to update:
                </p>

                <div className="space-y-4 pb-16">
                  {" "}
                  {/* Added bottom padding to ensure content is visible above fixed footer */}
                  {Object.entries(workoutUpdates).map(
                    ([exerciseId, update]) => {
                      // Find the exercise in sessionExercises to get the name
                      const exercise = sessionExercises.find(
                        (ex) => ex.id === exerciseId
                      );
                      if (!exercise) return null;

                      // Change this isDifferent logic to be separate from PR detection:
                      const isDifferent =
                        update.sets !== exercise.targetSets ||
                        update.reps !== exercise.targetReps ||
                        update.weight !== exercise.targetWeight;

                      return (
                        <div
                          key={exerciseId}
                          className={`p-4 rounded-lg border ${
                            isDifferent
                              ? "border-primary/30 bg-primary/5"
                              : "border-default-200"
                          }`}
                        >
                          {/* Replace the current PR display with this mobile-responsive version */}
                          <div className="flex flex-col sm:flex-row justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                isSelected={update.selected}
                                onValueChange={(isSelected) => {
                                  setWorkoutUpdates({
                                    ...workoutUpdates,
                                    [exerciseId]: {
                                      ...update,
                                      selected: isSelected,
                                    },
                                  });
                                }}
                              />
                              <span className="font-medium truncate max-w-[180px] sm:max-w-full">
                                {exercise.name}
                              </span>
                            </div>

                            {/* Mobile-responsive PR display */}
                            <div className="flex flex-wrap justify-end ml-8 sm:ml-0">
                              {update.isPR && (
                                <Chip
                                  color="success"
                                  size="sm"
                                  className="h-6 text-xs sm:text-sm"
                                >
                                  New Weight PR!
                                </Chip>
                              )}
                              {update.manuallyEdited && (
                                <Chip
                                  variant="flat"
                                  size="sm"
                                  className="h-6 text-xs sm:text-sm ml-1"
                                >
                                  Edited
                                </Chip>
                              )}
                            </div>
                          </div>

                          <div className="pl-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <p className="text-xs text-default-500">Sets:</p>
                              <Input
                                size="sm"
                                type="number"
                                value={update.sets.toString()}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value || "0");
                                  setWorkoutUpdates({
                                    ...workoutUpdates,
                                    [exerciseId]: {
                                      ...update,
                                      sets: value,
                                      manuallyEdited: true,
                                    },
                                  });
                                }}
                                endContent={
                                  <div className="flex items-center">
                                    <span className="text-default-400 text-small">
                                      / {exercise.targetSets}
                                    </span>
                                  </div>
                                }
                              />
                            </div>

                            <div className="space-y-1">
                              <p className="text-xs text-default-500">Reps:</p>
                              <Input
                                size="sm"
                                type="number"
                                value={update.reps.toString()}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value || "0");
                                  setWorkoutUpdates({
                                    ...workoutUpdates,
                                    [exerciseId]: {
                                      ...update,
                                      reps: value,
                                      manuallyEdited: true,
                                    },
                                  });
                                }}
                                endContent={
                                  <div className="flex items-center">
                                    <span className="text-default-400 text-small">
                                      / {exercise.targetReps}
                                    </span>
                                  </div>
                                }
                              />
                            </div>

                            <div className="space-y-1">
                              <p className="text-xs text-default-500">
                                Weight:
                              </p>
                              <Input
                                size="sm"
                                type="number"
                                value={convertFromStorageUnit(
                                  update.weight,
                                  useMetric
                                ).toFixed(1)}
                                onChange={(e) => {
                                  const displayValue = parseFloat(
                                    e.target.value || "0"
                                  );
                                  const storageValue = convertToStorageUnit(
                                    displayValue,
                                    useMetric
                                  );

                                  setWorkoutUpdates({
                                    ...workoutUpdates,
                                    [exerciseId]: {
                                      ...update,
                                      weight: storageValue,
                                      manuallyEdited: true,
                                    },
                                  });
                                }}
                                endContent={
                                  <div className="flex items-center">
                                    <span className="text-default-400 text-small">
                                      {useMetric ? "kg" : "lbs"}
                                    </span>
                                  </div>
                                }
                              />
                            </div>
                          </div>

                          {/* Show the changes against workout defaults separately */}
                          {isDifferent && (
                            <div className="mt-3 pl-7 text-xs text-default-500">
                              <div className="flex flex-wrap gap-x-3 gap-y-1">
                                <span>Changes from workout defaults:</span>
                                {update.sets !== exercise.targetSets && (
                                  <span>
                                    Sets: {exercise.targetSets} →{" "}
                                    <strong>{update.sets}</strong>
                                  </span>
                                )}
                                {update.reps !== exercise.targetReps && (
                                  <span>
                                    Reps: {exercise.targetReps} →{" "}
                                    <strong>{update.reps}</strong>
                                  </span>
                                )}
                                {update.weight !== exercise.targetWeight && (
                                  <span>
                                    Weight:{" "}
                                    {displayWeight(
                                      exercise.targetWeight,
                                      useMetric
                                    )}{" "}
                                    →{" "}
                                    <strong>
                                      {displayWeight(update.weight, useMetric)}
                                    </strong>
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="flat"
                  fullWidth
                  onPress={async () => {
                    setShowUpdateWorkoutModal(false);
                    setTimeout(async () => {
                      try {
                        await finalizeSession(new Date().toISOString());
                      } catch (err) {
                        console.error("Session finalization failed:", err);
                        toast.error("Failed to complete workout session");
                        setIsSubmitting(false);
                      }
                    }, 100);
                  }}
                >
                  Skip
                </Button>
                <Button
                  color="primary"
                  fullWidth
                  onPress={() => {
                    setShowUpdateWorkoutModal(false);
                    setTimeout(() => {
                      handleWorkoutUpdate();
                    }, 100);
                  }}
                >
                  Update Workout
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Add/fix the Exercise Selection Modal */}
      <Modal
        backdrop="opaque"
        isOpen={isOpen}
        onClose={onClose}
        scrollBehavior="inside"
        size="lg"
        placement="top" // Changed from center to top
        classNames={{
          base: "max-w-[95%] sm:max-w-3xl mx-auto max-h-[80vh]", // Add max height
          wrapper: "items-start justify-center p-2 pt-8", // Align to top
          body: "p-4 overflow-auto pb-12", // Add bottom padding for keyboard space
          footer:
            "pt-3 px-6 pb-5 flex flex-row gap-3 justify-end sticky bottom-0 z-10 bg-background border-t border-default-200", // Make footer sticky
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Select Exercise
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
                    startContent={<Search className="h-4 w-4" />}
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
                      <div className="py-5">
                        <p className="text-center text-gray-500">
                          No exercises found
                        </p>
                      </div>
                    }
                  >
                    {exercises.map((exercise) => (
                      <TableRow key={exercise.id}>
                        <TableCell>{exercise.name}</TableCell>
                        <TableCell>
                          {exercise.categories?.name || "Uncategorized"}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            color="primary"
                            isLoading={addingExercise === exercise.id}
                            onPress={() => {
                              setAddingExercise(exercise.id);

                              const newExercise = {
                                id: exercise.id,
                                name: exercise.name,
                                targetSets: 3,
                                targetReps: 10,
                                targetWeight: 0,
                                actualSets: Array.from(
                                  { length: 3 },
                                  (_, i) => ({
                                    setNumber: i + 1,
                                    reps: 0,
                                    weight: 0,
                                    completed: false,
                                  })
                                ),
                              };

                              // Add a small delay to show the loading state
                              setTimeout(() => {
                                setSessionExercises((prev) => [
                                  ...prev,
                                  newExercise,
                                ]);
                                toast.success(
                                  `${exercise.name} added to workout`
                                );
                                setAddingExercise(null);
                                onClose();
                              }, 300);
                            }}
                          >
                            Add
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Pagination
                  className="mt-4"
                  total={totalPages}
                  initialPage={1}
                  page={currentPage}
                  onChange={(page) => setCurrentPage(page)}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Add/fix Custom Exercise Modal */}
      <Modal
        backdrop="opaque"
        isOpen={isCustomOpen}
        onClose={onCustomClose}
        radius="lg"
        onOpenChange={onCustomOpenChange}
        placement="top" // Changed from center to top
        scrollBehavior="inside"
        classNames={{
          base: "m-0 mx-auto max-w-[95%] max-h-[80vh]", // Add max width/height constraints
          wrapper: "items-start justify-center p-2 pt-12", // Align to top with padding
          body: "gap-5 py-2 pb-12 overflow-auto", // Add bottom padding for keyboard
          footer:
            "pt-5 border-t border-default-200 sticky bottom-0 z-10 bg-background", // Make footer sticky
        }}
      >
        <ModalContent className="max-w-md mx-auto">
          {(onCustomClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h3 className="text-lg font-bold">Add Custom Exercise</h3>
              </ModalHeader>

              <ModalBody className="gap-5 py-2">
                {/* Note section with improved styling */}
                <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 p-3 rounded-lg text-sm">
                  <strong>NOTE:</strong> Creating a custom exercise here will
                  add it to your Exercise Library.
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
                  {/* Exercise Name Input - simplified structure */}
                  <Input
                    isRequired
                    label="Exercise Name"
                    name="exerciseName"
                    placeholder="Enter exercise name"
                    variant="bordered"
                    labelPlacement="outside"
                    errorMessage={customExerciseError}
                    onChange={() =>
                      customExerciseError && setCustomExerciseError(null)
                    }
                    classNames={{
                      label: "text-sm font-medium text-default-700 mb-1.5",
                      inputWrapper: "shadow-sm",
                    }}
                  />

                  {/* Category Selection - simplified structure */}
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
                      label: "text-sm font-medium text-default-700 mb-1.5",
                      trigger: "shadow-sm",
                      popoverContent: "shadow-lg",
                    }}
                  >
                    {categories.map((category) => (
                      <SelectItem key={String(category.id)} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </Select>

                  {/* Description Textarea - simplified structure */}
                  <Textarea
                    label="Description"
                    name="exerciseDescription"
                    placeholder="Describe the exercise (optional)"
                    variant="bordered"
                    labelPlacement="outside"
                    minRows={3}
                    classNames={{
                      label: "text-sm font-medium text-default-700 mb-1.5",
                      inputWrapper: "shadow-sm",
                    }}
                  />
                </form>
              </ModalBody>

              <ModalFooter className="pt-5 border-t border-default-200">
                <Button color="danger" variant="flat" onPress={onCustomClose}>
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

      {/* Incomplete Exercises Confirmation Modal */}
      <Modal
        isOpen={showIncompleteExercisesModal}
        onClose={() => setShowIncompleteExercisesModal(false)}
        backdrop="opaque"
        placement="center"
        size="sm"
        classNames={{
          base: "max-w-[95%] sm:max-w-md mx-auto",
          header: "pb-0",
          body: "px-6 py-5",
          footer: "pt-3 px-6 pb-5 flex flex-col sm:flex-row gap-2",
          closeButton: "top-3 right-3",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 border-b border-default-200 pb-3">
                <h3 className="text-lg font-bold">Incomplete Exercises</h3>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-3">
                  <p>The following exercises have no completed sets:</p>
                  <p className="font-semibold text-danger bg-danger-50 dark:bg-danger-900/20 p-3 rounded-md">
                    {incompleteExercisesNames}
                  </p>
                  <p className="mt-2">
                    Do you still want to finish the workout?
                  </p>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="primary"
                  fullWidth
                  onPress={async () => {
                    setShowIncompleteExercisesModal(false);
                    setCompletingWorkout(true);

                    // Continue with existing workflow from onSessionSubmit
                    const endTime = new Date().toISOString();

                    const updates: {
                      [exerciseId: string]: {
                        sets: number;
                        reps: number;
                        weight: number;
                        selected: boolean;
                        isPR: boolean;
                        manuallyEdited: boolean;
                      };
                    } = {};

                    // Track if we have any updates to suggest
                    let hasUpdatesToSuggest = false;

                    const { data: existingPRs } = await supabase
                      .from("analytics")
                      .select("exercise_id, max_weight")
                      .eq("user_id", user.id);

                    // Create a more detailed PR map
                    const prMap = new Map();
                    existingPRs?.forEach((pr) => {
                      prMap.set(`${pr.exercise_id}`, pr.max_weight || 0);
                    });

                    // Calculate suggested updates with better PR detection
                    sessionExercises.forEach((exercise) => {
                      const completedSets = exercise.actualSets.filter(
                        (set) => set.completed
                      );
                      if (completedSets.length > 0) {
                        // Get the best metrics from completed sets
                        const bestWeight = Math.max(
                          ...completedSets.map((set) => set.weight || 0)
                        );
                        const bestReps = Math.max(
                          ...completedSets.map((set) => set.reps || 0)
                        );

                        const isPR = bestWeight > (prMap.get(exercise.id) || 0);

                        // Define shouldUpdate - typically we should update if there's a PR or significant change
                        const shouldUpdate =
                          isPR ||
                          completedSets.length !== exercise.targetSets ||
                          bestReps !== exercise.targetReps ||
                          bestWeight > exercise.targetWeight;

                        // Flag if we have any updates to suggest (used for modal display logic)
                        if (shouldUpdate) {
                          hasUpdatesToSuggest = true;
                        }

                        // Now with valid type and defined shouldUpdate
                        updates[exercise.id] = {
                          sets: completedSets.length,
                          reps: bestReps,
                          weight: bestWeight,
                          selected: shouldUpdate,
                          isPR,
                          manuallyEdited: false,
                        };
                      }
                    });

                    if (hasUpdatesToSuggest) {
                      setWorkoutUpdates(updates);
                      setShowUpdateWorkoutModal(true);
                    } else {
                      // If no updates to suggest, proceed with normal flow
                      await finalizeSession(endTime);
                    }
                  }}
                >
                  Yes, Finish Workout
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Cancel Workout Confirmation Modal */}
      <Modal
        isOpen={isCancelConfirmOpen}
        onClose={onCancelConfirmClose}
        backdrop="opaque"
        placement="center"
        size="sm"
        classNames={{
          base: "max-w-[95%] sm:max-w-md mx-auto",
          header: "pb-0",
          body: "px-6 py-5",
          footer: "pt-3 px-6 pb-5 flex flex-col sm:flex-row gap-2",
          closeButton: "top-3 right-3",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 border-b border-default-200 pb-3">
                <h3 className="text-lg font-bold">Cancel Workout</h3>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-3">
                  <p>Are you sure you want to cancel this workout session?</p>
                  <p className="text-danger">
                    This action cannot be undone, and your progress will be
                    lost.
                  </p>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="light"
                  fullWidth
                  onPress={onCancelConfirmClose}
                >
                  Keep Working Out
                </Button>
                <Button
                  color="danger"
                  fullWidth
                  onPress={() => {
                    // End the session
                    endSession();
                    console.log("endSession called from Cancel Workout");
                    toast.info("Workout session canceled");

                    // Navigate back to workouts page with a full page reload
                    setTimeout(() => {
                      toast.info("Workout session canceled");
                      window.location.href = `/protected/workouts?ts=${Date.now()}`;
                    }, 300);
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
