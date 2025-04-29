import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Simple header instead of PageTitle component */}
      <h1 className="font-bold text-2xl sm:text-3xl md:text-4xl mb-6">
        Privacy Policy
      </h1>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="prose max-w-none">
          <p className="text-gray-600 mb-8">Last updated: March 21, 2025</p>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">1. Introduction</h2>
            <p>
              Welcome to FitFlow ("we," "our," or "us"). We respect your privacy
              and are committed to protecting your personal data. This privacy
              policy explains how we collect, use, and safeguard your
              information when you use our fitness tracking application.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">
              2. Information We Collect
            </h2>
            <h3 className="text-lg font-semibold mt-4 mb-2">
              2.1 Account Information
            </h3>
            <p>When you create an account, we collect:</p>
            <ul className="list-disc pl-5 mb-4">
              <li>Email address</li>
              <li>Password (stored in encrypted form)</li>
            </ul>

            <h3 className="text-lg font-semibold mt-4 mb-2">
              2.2 Fitness Data
            </h3>
            <p>We collect fitness data that you input, including:</p>
            <ul className="list-disc pl-5 mb-4">
              <li>Workout plans and routines</li>
              <li>Exercise records (sets, reps, weights)</li>
              <li>Personal records and progress metrics</li>
              <li>Custom exercises you create</li>
              <li>Unit preferences (metric or imperial)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">
              3. How We Use Your Information
            </h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-5 mb-4">
              <li>Provide and maintain the FitFlow service</li>
              <li>Store and display your workout history and progress</li>
              <li>
                Generate analytics and insights about your fitness journey
              </li>
              <li>Improve and enhance the functionality of our application</li>
              <li>Communicate important updates or changes to our service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">
              4. Data Storage and Security
            </h2>
            <p>
              We use Supabase, a secure database platform, to store your
              information. We implement appropriate technical and organizational
              measures to protect your personal data against unauthorized
              access, accidental loss, or destruction.
            </p>
            <p className="mt-2">
              Your fitness data is stored in our secure database and is
              accessible only to you through your authenticated account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">5. Data Retention</h2>
            <p>
              We will retain your personal information and fitness data for as
              long as your account is active or as needed to provide you with
              our services. If you wish to delete your account, your personal
              information will be deleted from our systems, though we may retain
              anonymous, aggregated data for analytical purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 mb-4">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a structured format</li>
              <li>
                Object to our processing of your data under certain conditions
              </li>
            </ul>
            <p>
              To exercise these rights, you can manage most data-related
              settings directly through your account preferences.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">
              7. Cookies and Local Storage
            </h2>
            <p>
              FitFlow uses browser local storage to enhance your experience by
              storing certain preferences and session information directly on
              your device. This helps us maintain your active workout sessions
              and preferences between visits.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">8. Third-Party Services</h2>
            <p>
              We use the following third-party services to power our
              application:
            </p>
            <ul className="list-disc pl-5 mb-4">
              <li>Supabase for authentication and data storage</li>
              <li>Vercel for application hosting</li>
            </ul>
            <p>
              These services have their own privacy policies that govern how
              they process data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">9. Children's Privacy</h2>
            <p>
              FitFlow is not intended for children under 13 years of age. We do
              not knowingly collect personal information from children under 13.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">
              10. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this privacy policy from time to time. We will
              notify you of any changes by posting the new privacy policy on
              this page and updating the "Last updated" date at the top.
            </p>
          </section>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <Link href="/" className="text-primary hover:underline">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
