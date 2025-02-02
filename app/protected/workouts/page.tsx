"use client";

import PageTitle from "@/components/ui/page-title";
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
import { useEffect, useState } from "react";

const getWorkoutData = async (supabase: any) => {
  const { data } = await supabase.from("workouts").select();
  return data;
};

const Actions = ({
  id,
  setWorkouts,
}: {
  id: string;
  setWorkouts: React.Dispatch<React.SetStateAction<any[] | null>>;
}) => {
  const supabase = createClient();

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
    <div className="relative flex justify-end items-center gap-2">
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
            className="text-danger"
            onPress={() => deleteWorkout(id)}
            key="delete"
          >
            Delete
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  );
};

export default function Workouts() {
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
    <>
      <PageTitle title="Workouts" />
      {/* <pre className="w-full">{JSON.stringify(workouts, null, 2)}</pre> */}
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
                <Actions id={workout.id} setWorkouts={setWorkouts} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
