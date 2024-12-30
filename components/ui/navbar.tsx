import {
  Button,
  NavbarContent,
  NavbarItem,
  Link as NextUILink,
  Navbar as NextUINavbar,
} from "@nextui-org/react";
import { BicepsFlexed, ChartLine, History, Library } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
  return (
    <NextUINavbar className="bg-oatBrown w-full flex justify-center mt-12 pt-4 pb-4">
      <NavbarContent justify="center" className="flex justify-center w-full">
        <NavbarItem className="flex flex-col justify-center align-center text-center">
          <Link href="/workouts" passHref>
            <Button as={NextUILink} color="primary">
              <Library />
            </Button>
          </Link>
          <h4>Workouts</h4>
        </NavbarItem>
        <NavbarItem className="flex flex-col justify-center align-center text-center">
          <Link href="/exercises" passHref>
            <Button as={NextUILink} color="primary">
              <BicepsFlexed />
            </Button>
          </Link>
          <h4>Exercises</h4>
        </NavbarItem>
        <NavbarItem className="flex flex-col justify-center align-center text-center">
          <Link href="/sessions" passHref>
            <Button as={NextUILink} color="primary">
              <History />
            </Button>
          </Link>
          <h4>Sessions</h4>
        </NavbarItem>
        <NavbarItem className="flex flex-col justify-center align-center text-center">
          <Link href="/exercises" passHref>
            <Button as={NextUILink} color="primary">
              <ChartLine />
            </Button>
          </Link>
          <h4>Analytics</h4>
        </NavbarItem>
      </NavbarContent>
    </NextUINavbar>
  );
}
