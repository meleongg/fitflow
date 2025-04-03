"use client";

import ActiveSessionBanner from "@/components/active-session-banner";
import PageTitle from "@/components/ui/page-title";
import { useSession } from "@/contexts/SessionContext";
import { createClient } from "@/utils/supabase/client";
import {
  Button,
  Card,
  Chip,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
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
} from "@nextui-org/react";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  EllipsisVertical,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Enhanced workout data fetching with pagination
const getWorkoutData = async (supabase: any, page = 1, pageSize = 6) => {
  // Calculate range for pagination
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  const countResponse = await supabase
    .from("workouts")
    .select("id", { count: "exact" });

  const totalCount = countResponse.count || 0;

  const { data, error } = await supabase
    .from("workouts")
    .select(
      `
      *,
      workout_exercises(count)
    `
    )
    .order("created_at", { ascending: false })
    .range(start, end);

  if (error) throw error;

  return {
    workouts: data,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
  };
};

// Update the Actions component to stop event propagation more effectively
const Actions = ({
  id,
  workoutName,
  setWorkouts,
}: {
  id: string;
  workoutName: string;
  setWorkouts: React.Dispatch<React.SetStateAction<any[] | null>>;
}) => {
  const router = useRouter();
  const supabase = createClient();
  const { activeSession } = useSession();
  const [showWarning, setShowWarning] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // If you want to handle page changes after deletion, pass these up to the parent
  const deleteWorkout = async (workoutId: string) => {
    try {
      // Show loading toast
      const toastId = toast.loading(`Deleting ${workoutName}...`);

      await supabase.from("workouts").delete().eq("id", workoutId);

      // Get updated data after deletion
      const { workouts: updatedWorkouts, totalPages: newTotalPages } =
        await getWorkoutData(supabase, 1); // Reset to page 1 after deletion

      // Only set the workouts array, not the entire object
      setWorkouts(updatedWorkouts);

      // Success toast
      toast.dismiss(toastId);
      toast.success(`${workoutName} deleted successfully`);

      // If you have a way to update the parent's pagination state, do it here
      // Example: onPaginationChange(1, newTotalPages);
    } catch (error) {
      console.error("Error deleting workout:", error);
      toast.error(`Failed to delete ${workoutName}`);
    }
  };

  return (
    <div
      className="isolate"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <Dropdown
        className="bg-background border-1 border-default-200"
        shouldBlockScroll={true}
        disableAnimation={false} // Try disabling animation
      >
        <DropdownTrigger>
          <div
            className="cursor-pointer p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <EllipsisVertical className="h-4 w-4" />
          </div>
        </DropdownTrigger>
        <DropdownMenu>
          <DropdownItem key="view" as={Link} href={`/protected/workouts/${id}`}>
            View
          </DropdownItem>
          <DropdownItem
            key="edit"
            as={Link}
            href={`/protected/workouts/${id}/edit`}
          >
            Edit
          </DropdownItem>
          <DropdownItem
            key="start"
            onPress={() => {
              if (activeSession?.workoutId) {
                setShowWarning(true);
              } else {
                toast.info(`Starting ${workoutName} session`);
                router.push(`/protected/workouts/${id}/session`);
              }
            }}
          >
            Start Workout
          </DropdownItem>
          <DropdownItem
            className="text-danger"
            color="danger"
            onPress={() => {
              // Open the delete modal instead of using confirm()
              setShowDeleteModal(true);
            }}
            key="delete"
          >
            Delete
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>

      {showWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-2">
              Active Session in Progress
            </h3>
            <p className="mb-4">
              You already have an active workout session for "
              {activeSession?.workoutName}". Please complete or end that session
              before starting a new one.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button onPress={() => setShowWarning(false)} variant="flat">
                Close
              </Button>
              <Button
                as={Link}
                href={`/protected/workouts/${activeSession?.workoutId}/session`}
                color="primary"
              >
                Return to Session
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        backdrop="opaque"
        placement="center"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h3 className="text-lg font-bold">Delete Workout</h3>
              </ModalHeader>
              <ModalBody>
                <p>
                  Are you sure you want to delete{" "}
                  <span className="font-semibold">{workoutName}</span>?
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  This action cannot be undone.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color="danger"
                  onPress={() => {
                    deleteWorkout(id);
                    onClose();
                  }}
                >
                  Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default function WorkoutsPage() {
  // State management
  const [workouts, setWorkouts] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(6); // Number of workouts per page
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const supabase = createClient();

  // Add these new states
  const [sortOption, setSortOption] = useState("newest");
  const [filterOption, setFilterOption] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // First, add a TypeScript interface for your category at the top of your file
  interface WorkoutCategory {
    id: number | string;
    name: string;
  }

  // Add this state at the top of your component
  const [categories, setCategories] = useState<WorkoutCategory[]>([]);

  // Add this function to fetch categories
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  // Load workouts with pagination
  const loadWorkouts = async (page = currentPage) => {
    try {
      if (!isInitialLoad) setIsLoading(true);

      // Start building the main query
      let query = supabase.from("workouts").select(`
          *,
          category:categories(*),
          workout_exercises(exercise_id, exercises(name, category_id, categories(name)))
        `);

      // Build the count query FIRST (before using it)
      let countQuery = supabase
        .from("workouts")
        .select("id", { count: "exact" });

      // Apply filters to BOTH queries
      if (filterOption !== "all") {
        query = query.eq("category_id", filterOption);
        countQuery = countQuery.eq("category_id", filterOption);
      }

      // Apply search to BOTH queries
      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
        countQuery = countQuery.ilike("name", `%${searchQuery}%`);
      }

      // Execute count query
      const { count, error: countError } = await countQuery;

      if (countError) throw countError;
      const totalCount = count || 0;

      // Apply sorting to main query
      switch (sortOption) {
        case "newest":
          query = query.order("created_at", { ascending: false });
          break;
        case "oldest":
          query = query.order("created_at", { ascending: true });
          break;
        case "name_asc":
          query = query.order("name", { ascending: true });
          break;
        case "name_desc":
          query = query.order("name", { ascending: false });
          break;
        case "most_used":
          query = query.order("last_used_at", {
            ascending: false,
            nullsFirst: false,
          });
          break;
      }

      // Apply pagination
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;

      const { data, error } = await query.range(start, end);

      if (error) throw error;

      setWorkouts(data);
      setTotalPages(Math.ceil(totalCount / pageSize));

      // Short timeout to ensure smooth transitions
      setTimeout(() => {
        setIsLoading(false);
        setIsInitialLoad(false);
      }, 100);
    } catch (error) {
      console.error("Error fetching workouts:", error);
      toast.error("Failed to load workouts");
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  };

  // Add this effect to reload when sort/filter changes
  useEffect(() => {
    if (!isInitialLoad) {
      setCurrentPage(1); // Reset to first page when filters change
      loadWorkouts(1);
    }
  }, [sortOption, filterOption, searchQuery]);

  // Initial load
  useEffect(() => {
    fetchCategories();
    loadWorkouts(1);
  }, []);

  // Handle page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadWorkouts(page);

    // Scroll to top of workout section smoothly
    document.getElementById("workouts-container")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="flex flex-col space-y-6 p-4 animate-fadeIn">
      <ActiveSessionBanner />

      <PageTitle title="Workouts" />

      {/* Add search, sort and filter controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          {/* Search input */}
          <Input
            placeholder="Search workouts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startContent={<Search className="text-default-400 h-4 w-4" />}
            isClearable
            onClear={() => setSearchQuery("")}
            className="w-full sm:w-1/3"
          />

          {/* Sort dropdown */}
          <Select
            aria-label="Sort workouts"
            placeholder="Sort by"
            selectedKeys={[sortOption]}
            onChange={(e) => setSortOption(e.target.value)}
            className="w-full sm:w-auto"
            startContent={<ArrowUpDown className="text-default-400 h-4 w-4" />}
          >
            <SelectItem key="newest" value="newest">
              Newest first
            </SelectItem>
            <SelectItem key="oldest" value="oldest">
              Oldest first
            </SelectItem>
            <SelectItem key="name_asc" value="name_asc">
              Name (A-Z)
            </SelectItem>
            <SelectItem key="name_desc" value="name_desc">
              Name (Z-A)
            </SelectItem>
            <SelectItem key="most_used" value="most_used">
              Most used
            </SelectItem>
          </Select>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          <Chip
            variant={filterOption === "all" ? "solid" : "flat"}
            color="primary"
            className="cursor-pointer"
            onClick={() => setFilterOption("all")}
          >
            All
          </Chip>

          {/* Dynamic category chips */}
          {categories.map((category) => (
            <Chip
              key={category.id}
              variant={
                filterOption === category.id.toString() ? "solid" : "flat"
              }
              className="cursor-pointer"
              onClick={() => setFilterOption(category.id.toString())}
            >
              {category.name}
            </Chip>
          ))}
        </div>
      </div>

      <div
        className="flex flex-col sm:flex-row justify-between items-center gap-4"
        id="workouts-container"
      >
        <Button
          as={Link}
          href="/protected/workouts/create-workout"
          color="primary"
          className="dark:text-white w-full sm:w-auto"
          startContent={<Plus className="h-4 w-4" />}
        >
          Create Workout
        </Button>

        {/* Only show pagination when we have more than one page and not loading */}
        {!isLoading && totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <Button
              isIconOnly
              size="sm"
              variant="flat"
              isDisabled={currentPage === 1}
              onPress={() => handlePageChange(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Pagination
              total={totalPages}
              initialPage={1}
              page={currentPage}
              onChange={handlePageChange}
              size="sm"
              className="hidden sm:flex"
            />
            <span className="text-sm flex sm:hidden">
              {currentPage} / {totalPages}
            </span>
            <Button
              isIconOnly
              size="sm"
              variant="flat"
              isDisabled={currentPage === totalPages}
              onPress={() => handlePageChange(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="transition-all duration-300 ease-in-out w-full">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(pageSize)].map((_, i) => (
              <Card key={i} className="w-full p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="space-y-2 w-full">
                    <Skeleton className="h-6 w-3/4 rounded-lg" />
                    <Skeleton className="h-4 w-full rounded-lg" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              </Card>
            ))}
          </div>
        ) : workouts && workouts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workouts.map((workout) => (
                <Card
                  key={workout.id}
                  className="p-4 hover:shadow-md transition-shadow duration-200"
                  isPressable
                  as={Link}
                  href={`/protected/workouts/${workout.id}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-semibold">{workout.name}</h3>
                      {workout.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {workout.description}
                        </p>
                      )}
                    </div>

                    {/* Isolated Actions Container */}
                    <div
                      className="relative z-10"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      style={{ pointerEvents: "auto" }}
                    >
                      <Actions
                        id={workout.id}
                        workoutName={workout.name}
                        setWorkouts={setWorkouts}
                      />
                    </div>
                  </div>

                  {/* Category and other metadata */}
                  <div className="flex items-center gap-2 mt-3">
                    {workout.category && (
                      <Chip size="sm" variant="flat" color="primary">
                        {workout.category.name}
                      </Chip>
                    )}
                    <Chip size="sm" variant="flat">
                      {workout.workout_exercises.length} exercises
                    </Chip>
                  </div>
                </Card>
              ))}
            </div>

            {/* Bottom pagination for larger datasets */}
            {totalPages > 1 && (
              <div className="flex justify-center mb-6">
                <Pagination
                  total={totalPages}
                  initialPage={1}
                  page={currentPage}
                  onChange={handlePageChange}
                  showControls
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 border rounded-lg transition-all duration-300 ease-in">
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <Dumbbell className="w-10 h-10" />
              <p className="mb-4">No workouts found</p>
              <Button
                as={Link}
                href="/protected/workouts/create-workout"
                color="primary"
                size="sm"
              >
                Create Your First Workout
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
