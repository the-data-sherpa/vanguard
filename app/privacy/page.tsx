import Link from 'next/link';
import Image from 'next/image';

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
            <Image src="/logo.png" alt="Vanguard" width={24} height={24} className="rounded" />
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
            <p className="text-muted-foreground mb-4">We collect the following types of information:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Account information:</strong> Email address and name when you create an account</li>
              <li><strong>Organization data:</strong> Tenant configuration, settings, and preferences</li>
              <li><strong>Usage data:</strong> How you interact with our services to improve functionality</li>
              <li><strong>Device information:</strong> Browser type and device information for security purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Incident and Weather Data</h2>
            <p className="text-muted-foreground mb-4">
              Vanguard aggregates and displays incident and weather data from publicly available third-party sources:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>PulsePoint:</strong> Emergency incident data including call types, responding units, and locations</li>
              <li><strong>National Weather Service (NWS):</strong> Weather alerts and warnings</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              This data is already publicly accessible through these services. Vanguard does not create or
              originate this incident data; we display information that is already in the public domain.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Address Information and Medical Privacy</h2>
            <p className="text-muted-foreground mb-4">
              To protect individual privacy, incident addresses are handled differently based on incident type:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Medical incidents:</strong> Display generalized location only (street name without specific house numbers)</li>
              <li><strong>Non-medical incidents</strong> (fire, rescue, traffic, etc.): Display full address as provided by PulsePoint</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              This address handling mirrors how data is provided by PulsePoint and does not expose any
              information beyond what is already publicly available.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Public Status Pages</h2>
            <p className="text-muted-foreground mb-4">
              Organizations using Vanguard may enable a public status page feature that displays:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Active incident summaries with call types and locations</li>
              <li>Responding unit information</li>
              <li>Weather alerts for the service area</li>
              <li>Historical incident activity</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Public status pages can be embedded on third-party websites. All information displayed on
              public status pages is sourced from publicly available data (PulsePoint, NWS).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Social Media Integration</h2>
            <p className="text-muted-foreground mb-4">
              Organizations may connect their Facebook page to automatically share incident information.
              When this feature is enabled:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Incident details are posted to the organization&apos;s Facebook page</li>
              <li>Organizations control which incident types are shared via configurable rules</li>
              <li>Posted content becomes subject to Facebook&apos;s privacy policy</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">How We Use Your Information</h2>
            <p className="text-muted-foreground mb-4">We use collected information to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Provide and maintain our services</li>
              <li>Process your subscription and billing</li>
              <li>Send service-related communications</li>
              <li>Improve and optimize our platform</li>
              <li>Ensure security and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Data Security</h2>
            <p className="text-muted-foreground">
              We implement industry-standard security measures to protect your information, including
              encryption in transit (TLS 1.3) and at rest (AES-256), secure cloud infrastructure,
              and regular security assessments. See our <Link href="/security" className="underline">Security page</Link> for
              more details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Third-Party Services</h2>
            <p className="text-muted-foreground mb-4">
              Our platform integrates with the following third-party services, each with their own privacy policies:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>PulsePoint:</strong> Emergency incident data provider</li>
              <li><strong>National Weather Service:</strong> Weather alert data</li>
              <li><strong>Stripe:</strong> Payment processing</li>
              <li><strong>Clerk:</strong> Authentication services</li>
              <li><strong>Facebook:</strong> Social media integration (optional)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Data Retention</h2>
            <p className="text-muted-foreground">
              Account information is retained while your account is active. Incident data is retained
              for historical reporting purposes. You may request deletion of your account and associated
              data by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Your Rights</h2>
            <p className="text-muted-foreground mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your account and data</li>
              <li>Export your organization&apos;s data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy as our services evolve. We will notify users of any
              material changes by posting the updated policy on this page with a revised date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Contact</h2>
            <p className="text-muted-foreground">
              If you have questions about this Privacy Policy or our data practices, please contact us
              at support@vanguardalerts.com.
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
