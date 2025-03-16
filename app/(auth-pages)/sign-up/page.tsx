import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell } from "lucide-react";
import Link from "next/link";
import { SmtpMessage } from "../smtp-message";

export default async function Signup(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  if ("message" in searchParams) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="flex justify-center mb-4">
              <div className="bg-primary p-3 rounded-full">
                <Dumbbell className="h-6 w-6 text-white" />
              </div>
            </div>
            <FormMessage message={searchParams} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="mb-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-primary p-3 rounded-full">
                <Dumbbell className="h-6 w-6 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold">Create an account</h1>
            <p className="text-sm text-gray-700 mt-1">
              Start your fitness journey with FitFlow
            </p>
          </div>

          <form className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                name="email"
                id="email"
                placeholder="you@example.com"
                type="email"
                className="w-full h-10 px-3 py-2 border rounded-md"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <Input
                type="password"
                id="password"
                name="password"
                placeholder="Create a password"
                className="w-full h-10 px-3 py-2 border rounded-md"
                minLength={6}
                required
              />
              <p className="text-xs text-gray-700">
                Password must be at least 6 characters long
              </p>
            </div>

            <SubmitButton
              pendingText="Signing up..."
              formAction={signUpAction}
              className="w-full bg-primary text-white py-2 rounded-md font-medium hover:bg-primary-dark transition-colors mt-2"
            >
              Create account
            </SubmitButton>

            <FormMessage message={searchParams} />
          </form>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-700">
              Already have an account?{" "}
              <Link
                className="text-primary font-medium hover:underline"
                href="/sign-in"
              >
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-6">
            <SmtpMessage />
          </div>
        </div>
      </div>
    </div>
  );
}
