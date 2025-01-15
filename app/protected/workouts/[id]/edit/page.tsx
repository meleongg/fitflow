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
          <DropdownItem key="view" as={Link} href={`/workouts/${id}`}>
            View
          </DropdownItem>
          <DropdownItem key="edit" as={Link} href={`/workouts/${id}/edit`}>
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

export default function EditWorkout() {
  const [workoutExercises, setWorkoutExercises] = useState<any[] | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // TODO: Fetch existing workout names and check for duplicates
  }, []);

  return (
    <>
      <PageTitle title="New Workout" />
      <div className="bg-creamyBeige p-4 rounded-lg">
        Choose from our existing exercises or create your own.
      </div>
      <Button color="primary">Add Exercise</Button>
      <Table aria-label="Example static collection table">
        <TableHeader>
          <TableColumn>NAME</TableColumn>
          <TableColumn>ACTIONS</TableColumn>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Exericse 1</TableCell>
            <TableCell>Exericse 1</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Exericse 2</TableCell>
            <TableCell>Exericse 1</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </>
  );
}
