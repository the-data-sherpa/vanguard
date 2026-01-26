import Link from 'next/link';
import Image from 'next/image';

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
            <Image src="/logo.png" alt="Vanguard" width={24} height={24} className="rounded" />
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
              emergency incident data from PulsePoint and weather alerts from the National Weather
              Service. The Service is provided for informational purposes to help communities stay
              informed about local emergency activity.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Subscription and Billing</h2>
            <p className="text-muted-foreground mb-4">
              Access to Vanguard requires a paid subscription after a 7-day trial period. By subscribing, you agree to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Pay the applicable subscription fees</li>
              <li>Provide accurate billing information</li>
              <li>Accept that subscriptions renew automatically unless cancelled</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              You may cancel your subscription at any time through your billing settings. Refunds are
              handled in accordance with our refund policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">User Responsibilities</h2>
            <p className="text-muted-foreground mb-4">When using the Service, you agree to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Provide accurate information when creating an account</li>
              <li>Keep your account credentials secure and confidential</li>
              <li>Use the Service in compliance with applicable laws</li>
              <li>Not attempt to interfere with, disrupt, or reverse engineer the Service</li>
              <li>Not use the Service for any unlawful or unauthorized purpose</li>
              <li>Not share your account access with unauthorized users</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Public Status Pages</h2>
            <p className="text-muted-foreground mb-4">
              Organizations may enable a public status page that displays incident and weather information
              without requiring authentication. By enabling this feature, you acknowledge that:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Incident data will be publicly accessible to anyone with the status page URL</li>
              <li>The status page may be embedded on third-party websites</li>
              <li>You are responsible for determining whether public display is appropriate for your organization</li>
              <li>All displayed data originates from public sources (PulsePoint, NWS)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Embedding and Third-Party Use</h2>
            <p className="text-muted-foreground mb-4">
              The embeddable status widget may be used on third-party websites subject to the following conditions:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>The embed must not be modified or altered</li>
              <li>The embed must link back to the full Vanguard status page</li>
              <li>The embed must not be used in a misleading or deceptive manner</li>
              <li>We reserve the right to disable embedding for any reason</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Social Media Integration</h2>
            <p className="text-muted-foreground mb-4">
              Organizations may connect social media accounts (such as Facebook) to automatically post
              incident information. By using this feature, you agree that:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>You have authority to post to the connected social media account</li>
              <li>You are responsible for the content posted to your social media accounts</li>
              <li>Posts are subject to the terms of service of the respective social media platform</li>
              <li>You will configure auto-post rules appropriately for your community</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Data Accuracy Disclaimer</h2>
            <p className="text-muted-foreground">
              The incident and weather information provided through Vanguard is sourced from third-party
              services (PulsePoint, National Weather Service) and is provided &quot;as is&quot; without warranty
              of any kind. We do not guarantee the accuracy, completeness, or timeliness of this data.
              Information may be delayed, incomplete, or contain errors. This information should not
              be used as the sole basis for emergency decisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Emergency Services Disclaimer</h2>
            <p className="text-muted-foreground font-medium">
              VANGUARD IS NOT A SUBSTITUTE FOR EMERGENCY SERVICES. Always follow official emergency
              management guidance and contact emergency services (911) in case of emergency. Do not
              rely on Vanguard for life-safety decisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Intellectual Property</h2>
            <p className="text-muted-foreground">
              The Vanguard platform, including its design, features, and functionality, is owned by
              Vanguard and protected by intellectual property laws. You may not copy, modify, distribute,
              or create derivative works based on our platform without permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Limitation of Liability</h2>
            <p className="text-muted-foreground">
              To the maximum extent permitted by law, Vanguard shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising from your use of the Service,
              including but not limited to damages arising from reliance on incident data, service
              interruptions, or data inaccuracies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Service Availability</h2>
            <p className="text-muted-foreground">
              We strive to maintain high availability but do not guarantee uninterrupted access to the
              Service. We reserve the right to modify, suspend, or discontinue any part of the Service
              at any time with reasonable notice when possible.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Termination</h2>
            <p className="text-muted-foreground">
              We may terminate or suspend your account and access to the Service at our discretion,
              including for violation of these Terms. Upon termination, your right to use the Service
              ceases immediately. You may also terminate your account at any time through your settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these Terms of Service at any time. We will notify users
              of material changes by posting the updated terms on this page with a revised date.
              Continued use of the Service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms shall be governed by and construed in accordance with the laws of the
              United States, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Contact</h2>
            <p className="text-muted-foreground">
              If you have questions about these Terms of Service, please contact us at support@vanguardalerts.com.
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
