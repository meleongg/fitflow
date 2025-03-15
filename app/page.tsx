import {
  Activity,
  ArrowRight,
  BarChart2,
  Calendar,
  CheckCircle,
  Dumbbell,
} from "lucide-react";
import Link from "next/link";

export default async function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="bg-primary p-2 rounded-full">
                <Dumbbell className="h-5 w-5 text-white" />
              </div>
              <span className="ml-2 text-xl font-bold">FitFlow</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/sign-in"
                className="text-gray-700 hover:text-primary transition-colors px-3 py-2"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col gap-12 px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="max-w-4xl mx-auto text-center pt-12 pb-16">
          <div className="flex justify-center mb-6">
            <div className="bg-primary p-4 rounded-full">
              <Dumbbell className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Track Your Fitness Journey with Ease
          </h1>
          <p className="text-xl text-gray-500 mb-8 max-w-2xl mx-auto">
            FitFlow helps you track workouts, monitor progress, and achieve your
            fitness goals with a simple, intuitive interface.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-up"
              className="bg-primary text-white px-6 py-3 rounded-md font-medium hover:bg-primary-dark transition-colors flex items-center justify-center"
            >
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="#features"
              className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-md font-medium hover:bg-gray-50 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="max-w-6xl mx-auto py-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              FitFlow provides all the tools you need to track and improve your
              fitness journey
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Workout Tracking</h3>
              <p className="text-gray-500">
                Log your exercises, sets, reps, and weights with an intuitive
                interface designed for the gym.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <BarChart2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Progress Analytics</h3>
              <p className="text-gray-500">
                Visualize your progress with detailed charts and metrics to keep
                you motivated.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Workout Planning</h3>
              <p className="text-gray-500">
                Create and schedule your workouts in advance to stay consistent
                with your routine.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Exercise Library</h3>
              <p className="text-gray-500">
                Access a comprehensive library of exercises with instructions
                and muscle targeting information.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Dumbbell className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Personal Records</h3>
              <p className="text-gray-500">
                Track your personal bests and celebrate your achievements as you
                progress.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6 text-primary"
                >
                  <path d="M12 22s-8-4-8-10V5l8-3 8 3v7c0 6-8 10-8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Data Security</h3>
              <p className="text-gray-500">
                Your fitness data is securely stored and accessible only to you.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary text-white py-16 px-4 rounded-lg max-w-6xl mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to start your fitness journey?
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Join thousands of users who are already tracking their fitness
              progress with FitFlow.
            </p>
            <Link
              href="/sign-up"
              className="bg-white text-primary px-6 py-3 rounded-md font-medium hover:bg-gray-100 transition-colors inline-flex items-center"
            >
              Get Started for Free
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center flex-col md:flex-row">
            <div className="flex items-center mb-6 md:mb-0">
              <div className="bg-primary p-2 rounded-full">
                <Dumbbell className="h-5 w-5 text-white" />
              </div>
              <span className="ml-2 text-xl font-bold">FitFlow</span>
            </div>
            <div className="flex flex-col items-center md:items-end">
              <p className="text-gray-500 text-sm mb-2">
                © 2025 FitFlow. All rights reserved.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-gray-500 hover:text-primary">
                  Privacy Policy
                </a>
                <a href="#" className="text-gray-500 hover:text-primary">
                  Terms of Service
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
