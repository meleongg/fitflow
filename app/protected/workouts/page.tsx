"use client";

import ActiveSessionBanner from "@/components/active-session-banner";
import PageTitle from "@/components/ui/page-title";
import { useSession } from "@/contexts/SessionContext";
import { createClient } from "@/utils/supabase/client";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@nextui-org/react";
import { EllipsisVertical } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const getWorkoutData = async (supabase: any) => {
  const { data } = await supabase.from("workouts").select();
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

  const deleteWorkout = async (workoutId: string) => {
    try {
      await supabase.from("workouts").delete().eq("id", workoutId);
      const data = await getWorkoutData(supabase);
      setWorkouts(data);
    } catch (error) {
      console.error("Error deleting workout:", error);
    }
  };

  return (
    <div className="relative">
      <Dropdown className="bg-background border-1 border-default-200">
        <DropdownTrigger>
          <Button isIconOnly radius="full" size="sm" variant="light">
            <EllipsisVertical />
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
                router.push(`/protected/workouts/${id}/session`);
              }
            }}
          >
            Start Workout
          </DropdownItem>
          <DropdownItem
            className="text-danger"
            onPress={() => deleteWorkout(id)}
            key="delete"
          >
            Delete
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>

      {showWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-xl font-bold mb-2">
              Active Session in Progress
            </h3>
            <p className="mb-4">
              You already have an active workout session for "
              {activeSession?.workoutName}". Please complete or end that session
              before starting a new one.
            </p>
            <div className="flex justify-end gap-2">
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
          </div>
        </div>
      )}
    </div>
  );
};

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<any[] | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const getData = async () => {
      const data = await getWorkoutData(supabase);
      setWorkouts(data);
    };
    getData();
  }, []);

  return (
    <div>
      <ActiveSessionBanner />
      <PageTitle title="Workouts" />
      <div className="bg-creamyBeige p-4 rounded-lg">
        This is the workout library. Create workouts or start sessions!
      </div>
      <Button
        as={Link}
        href="/protected/workouts/create-workout"
        color="primary"
      >
        Create Workout
      </Button>
      <Table aria-label="Example static collection table">
        <TableHeader>
          <TableColumn>NAME</TableColumn>
          <TableColumn>ACTIONS</TableColumn>
        </TableHeader>
        <TableBody>
          {(workouts || []).map((workout) => (
            <TableRow key={workout.id}>
              <TableCell>{workout.name}</TableCell>
              <TableCell>
                <Actions
                  id={workout.id}
                  workoutName={workout.name}
                  setWorkouts={setWorkouts}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
