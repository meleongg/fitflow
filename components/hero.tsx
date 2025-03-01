import { Button, Link as NextUILink } from "@nextui-org/react";
import Link from "next/link";

export default function Hero() {
  return (
    <div className="flex flex-col items-center py-12">
      <h1 className="text-4xl font-bold mb-4">Welcome to FitFlow</h1>
      <p className="text-lg mb-8 text-center max-w-md">
        Your ultimate workout library app. Track your sessions, analyze your
        progress, and stay motivated. HELLO WORLD
      </p>
      <div className="bg-creamyBeige w-full h-64 mb-8 flex items-center justify-center">
        {/* Placeholder for screenshots */}
        <span className="text-black">[Screenshots Placeholder]</span>
      </div>
      <Link href="/sign-up" passHref>
        <Button as={NextUILink} color="primary">
          Sign Up
        </Button>
      </Link>
    </div>
  );
}
