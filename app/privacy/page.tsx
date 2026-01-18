import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Vanguard - Community Incident Awareness Platform',
};

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: January 2025</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">Overview</h2>
            <p className="text-muted-foreground">
              Vanguard (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, and safeguard your information when you
              visit our website or use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Information We Collect</h2>
            <p className="text-muted-foreground mb-4">
              Vanguard is currently in development and not yet collecting user data. When our platform
              launches, we may collect:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Account information (email, name) when you create an account</li>
              <li>Usage data to improve our services</li>
              <li>Device and browser information for security purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">How We Use Your Information</h2>
            <p className="text-muted-foreground">
              Any information collected will be used solely to provide and improve our services,
              communicate with you about your account, and ensure the security of our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Data Security</h2>
            <p className="text-muted-foreground">
              We implement industry-standard security measures to protect your information, including
              encryption in transit and at rest, secure infrastructure, and regular security assessments.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Third-Party Services</h2>
            <p className="text-muted-foreground">
              Our platform integrates with third-party services such as PulsePoint and the National
              Weather Service to provide incident and weather data. These services have their own
              privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy as our services evolve. We will notify users of any
              material changes by posting the updated policy on this page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Contact</h2>
            <p className="text-muted-foreground">
              If you have questions about this Privacy Policy, please reach out to us through our
              website when contact options become available.
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
