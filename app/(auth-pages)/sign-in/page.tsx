import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Dumbbell } from "lucide-react";

export default async function Login(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;
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
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-sm text-gray-500 mt-1">
              Sign in to continue to FitFlow
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
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Link
                  className="text-xs text-primary hover:underline"
                  href="/forgot-password"
                >
                  Forgot Password?
                </Link>
              </div>
              <Input
                type="password"
                id="password"
                name="password"
                placeholder="Your password"
                className="w-full h-10 px-3 py-2 border rounded-md"
                required
              />
            </div>

            <SubmitButton
              pendingText="Signing In..."
              formAction={signInAction}
              className="w-full bg-primary text-white py-2 rounded-md font-medium hover:bg-primary-dark transition-colors mt-2"
            >
              Sign in
            </SubmitButton>

            <FormMessage message={searchParams} />
          </form>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              Don't have an account?{" "}
              <Link
                className="text-primary font-medium hover:underline"
                href="/sign-up"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
