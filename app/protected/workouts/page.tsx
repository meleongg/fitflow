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
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Skeleton,
} from "@nextui-org/react";
import { Calendar, Dumbbell, EllipsisVertical, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const getWorkoutData = async (supabase: any) => {
  const { data } = await supabase
    .from("workouts")
    .select(
      `
      *,
      workout_exercises(count)
    `
    )
    .order("created_at", { ascending: false });
  return data;
};

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

  const deleteWorkout = async (workoutId: string) => {
    try {
      // Show loading toast
      const toastId = toast.loading(`Deleting ${workoutName}...`);

      await supabase.from("workouts").delete().eq("id", workoutId);
      const data = await getWorkoutData(supabase);
      setWorkouts(data);

      // Success toast
      toast.dismiss(toastId);
      toast.success(`${workoutName} deleted successfully`);
    } catch (error) {
      console.error("Error deleting workout:", error);
      toast.error(`Failed to delete ${workoutName}`);
    }
  };

  return (
    <div className="relative">
      <Dropdown className="bg-background border-1 border-default-200">
        <DropdownTrigger>
          <Button
            isIconOnly
            radius="full"
            size="sm"
            variant="light"
            aria-label="Actions"
          >
            <EllipsisVertical className="h-4 w-4" />
          </Button>
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
  const [workouts, setWorkouts] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getData = async () => {
      try {
        setIsLoading(true);
        const data = await getWorkoutData(supabase);
        setWorkouts(data);
      } catch (error) {
        console.error("Error fetching workouts:", error);
        toast.error("Failed to load workouts");
      } finally {
        setIsLoading(false);
      }
    };
    getData();
  }, []);

  return (
    <div className="flex flex-col space-y-6 p-4">
      <ActiveSessionBanner />

      <PageTitle title="Workouts" />

      <div className="flex justify-between items-center">
        <Button
          as={Link}
          href="/protected/workouts/create-workout"
          color="primary"
          className="mb-4 dark:text-white"
          startContent={<Plus className="h-4 w-4" />}
        >
          Create Workout
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="w-full p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-40 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : workouts && workouts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workouts.map((workout) => (
            <Card key={workout.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-semibold">{workout.name}</h3>
                  {workout.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {workout.description}
                    </p>
                  )}
                </div>
                <Actions
                  id={workout.id}
                  workoutName={workout.name}
                  setWorkouts={setWorkouts}
                />
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Chip
                  size="sm"
                  variant="flat"
                  startContent={<Dumbbell className="h-3 w-3" />}
                >
                  {workout.workout_exercises[0]?.count || 0} exercises
                </Chip>
                {workout.created_at && (
                  <Chip
                    size="sm"
                    variant="flat"
                    color="secondary"
                    startContent={<Calendar className="h-3 w-3" />}
                  >
                    {new Date(workout.created_at).toLocaleDateString()}
                  </Chip>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border rounded-lg">
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
  );
}
