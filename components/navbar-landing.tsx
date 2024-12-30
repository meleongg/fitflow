import {
  Button,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Link as NextUILink,
} from "@nextui-org/react";
import Link from "next/link";

export default function NavbarLanding() {
  return (
    <Navbar className="bg-oatBrown justify-space-between">
      <NavbarBrand>
        <Link href="/" passHref>
          <NextUILink className="font-bold">FitFlow</NextUILink>
        </Link>
      </NavbarBrand>
      <NavbarContent justify="end">
        <NavbarItem>
          <Link href="/sign-in" passHref>
            <Button as={NextUILink} color="primary">
              Sign In
            </Button>
          </Link>
        </NavbarItem>
        <NavbarItem>
          <Link href="/sign-up" passHref>
            <Button as={NextUILink} color="primary">
              Sign Up
            </Button>
          </Link>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
}
