import {
  Button,
  NavbarContent,
  NavbarItem,
  Navbar as NextUINavbar,
} from "@nextui-org/react";
import { BicepsFlexed, ChartLine, History, Library } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
  return (
    <NextUINavbar
      position="sticky"
      className="bg-oatBrown w-full flex justify-center pt-4 pb-4 bottom-0"
    >
      <NavbarContent justify="center" className="flex justify-center w-full">
        <NavbarItem className="flex flex-col justify-center items-center text-center">
          <Button
            isIconOnly
            as={Link}
            href="/protected/workouts"
            color="primary"
          >
            <Library />
          </Button>
          <h4 className="mt-1">Workouts</h4>
        </NavbarItem>
        <NavbarItem className="flex flex-col justify-center items-center text-center">
          <Button
            isIconOnly
            as={Link}
            href="/protected/exercises"
            color="primary"
          >
            <BicepsFlexed />
          </Button>
          <h4 className="mt-1">Exercises</h4>
        </NavbarItem>
        <NavbarItem className="flex flex-col justify-center items-center text-center">
          <Button
            isIconOnly
            as={Link}
            href="/protected/sessions"
            color="primary"
          >
            <History />
          </Button>
          <h4 className="mt-1">Sessions</h4>
        </NavbarItem>
        <NavbarItem className="flex flex-col justify-center items-center text-center">
          <Button
            isIconOnly
            as={Link}
            href="/protected/analytics"
            color="primary"
          >
            <ChartLine />
          </Button>
          <h4 className="mt-1">Analytics</h4>
        </NavbarItem>
      </NavbarContent>
    </NextUINavbar>
  );
}
