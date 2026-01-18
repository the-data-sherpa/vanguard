import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for Vanguard - Community Incident Awareness Platform',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="font-bold">Vanguard</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: January 2025</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">Agreement to Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using Vanguard (&quot;the Service&quot;), you agree to be bound by these
              Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Description of Service</h2>
            <p className="text-muted-foreground">
              Vanguard is a community incident awareness platform that aggregates and displays
              emergency incident data and weather alerts. The Service is provided for informational
              purposes only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Service Availability</h2>
            <p className="text-muted-foreground">
              Vanguard is currently in development and not yet publicly available. These terms will
              apply when the Service launches. We reserve the right to modify, suspend, or discontinue
              the Service at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">User Responsibilities</h2>
            <p className="text-muted-foreground mb-4">When using the Service, you agree to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Provide accurate information when creating an account</li>
              <li>Keep your account credentials secure</li>
              <li>Use the Service in compliance with applicable laws</li>
              <li>Not attempt to interfere with or disrupt the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Disclaimer</h2>
            <p className="text-muted-foreground">
              The incident and weather information provided through Vanguard is sourced from third-party
              services and is provided &quot;as is&quot; without warranty of any kind. This information should not
              be used as the sole basis for emergency decisions. Always follow official emergency
              management guidance and contact emergency services (911) in case of emergency.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Limitation of Liability</h2>
            <p className="text-muted-foreground">
              To the maximum extent permitted by law, Vanguard shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these Terms of Service at any time. We will notify users
              of material changes by posting the updated terms on this page. Continued use of the
              Service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms shall be governed by and construed in accordance with the laws of the
              United States, without regard to conflict of law principles.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Vanguard. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
