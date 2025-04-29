import Link from "next/link";

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Simple header instead of PageTitle component */}
      <h1 className="font-bold text-2xl sm:text-3xl md:text-4xl mb-6">
        Terms of Service
      </h1>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="prose max-w-none">
          <p className="text-gray-600 mb-8">Last updated: March 21, 2025</p>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p>
              Welcome to FitFlow. By accessing or using our fitness tracking
              application, you agree to be bound by these Terms of Service. If
              you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">2. User Accounts</h2>
            <p>
              To access certain features of FitFlow, you will need to create an
              account. You are responsible for:
            </p>
            <ul className="list-disc pl-5 mb-4">
              <li>
                Maintaining the confidentiality of your account information
              </li>
              <li>All activities that occur under your account</li>
              <li>
                Notifying us immediately of any unauthorized use of your account
              </li>
            </ul>
            <p>
              We reserve the right to suspend or terminate accounts that violate
              these terms or for any other reason at our sole discretion.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">3. User Content</h2>
            <p>
              When you create custom exercises, workouts, or enter fitness data
              on FitFlow:
            </p>
            <ul className="list-disc pl-5 mb-4">
              <li>You retain ownership of your content</li>
              <li>
                You grant FitFlow a non-exclusive, worldwide, royalty-free
                license to use, display, and store this content solely for the
                purpose of providing the service to you
              </li>
              <li>
                You represent that you have all necessary rights to share this
                content and that it does not violate any laws or these terms
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">4. Acceptable Use</h2>
            <p>You agree not to use FitFlow to:</p>
            <ul className="list-disc pl-5 mb-4">
              <li>Violate any applicable laws or regulations</li>
              <li>Impersonate any person or entity</li>
              <li>
                Attempt to gain unauthorized access to any part of the service
              </li>
              <li>Transmit any viruses, malware, or other harmful code</li>
              <li>Interfere with or disrupt the integrity of the service</li>
              <li>Harass, abuse, or harm another person</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">5. Intellectual Property</h2>
            <p>
              The FitFlow service, including its design, logo, software, and
              content created by us, is protected by copyright, trademark, and
              other intellectual property laws. You may not copy, modify,
              distribute, or create derivative works based on our service
              without our explicit permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">6. Fitness Disclaimer</h2>
            <p>
              FitFlow is designed to help track fitness activities and is not
              intended to provide medical advice. The information provided
              through our service is for informational and educational purposes
              only.
            </p>
            <p className="mt-2">
              Before starting any exercise program or making significant changes
              to your fitness routine, you should consult with a healthcare
              professional. FitFlow is not responsible for any injuries or
              health issues that may result from using our application.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">
              7. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, FitFlow and its operators
              shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages resulting from your use or
              inability to use the service.
            </p>
            <p className="mt-2">
              FitFlow is provided on an "as is" and "as available" basis without
              warranties of any kind, either express or implied, including but
              not limited to warranties of merchantability, fitness for a
              particular purpose, or non-infringement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">8. Termination</h2>
            <p>
              We may terminate or suspend your access to FitFlow immediately,
              without prior notice or liability, for any reason, including
              breach of these Terms of Service. Upon termination, your right to
              use the service will cease immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">9. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. We will
              provide notice of significant changes by posting the updated terms
              on this page and updating the "Last updated" date. Your continued
              use of FitFlow after such changes constitutes your acceptance of
              the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">10. Governing Law</h2>
            <p>
              These Terms of Service shall be governed by and construed in
              accordance with the laws of the United States, without regard to
              its conflict of law provisions.
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
