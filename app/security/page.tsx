import { Shield, Lock, Server, Eye, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = {
  title: 'Security',
  description: 'Security practices and commitments for Vanguard - Community Incident Awareness Platform',
};

const securityFeatures = [
  {
    icon: Lock,
    title: 'Encryption',
    description: 'All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption.',
  },
  {
    icon: Server,
    title: 'Secure Infrastructure',
    description: 'Hosted on enterprise-grade cloud infrastructure with automatic security updates.',
  },
  {
    icon: Shield,
    title: 'Tenant Isolation',
    description: 'Complete logical separation between communities ensures your data stays private.',
  },
  {
    icon: Eye,
    title: 'Audit Logging',
    description: 'Comprehensive logging of system access and changes for accountability.',
  },
  {
    icon: RefreshCw,
    title: 'Regular Assessments',
    description: 'Ongoing security reviews and updates to address emerging threats.',
  },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <Image src="/logo.jpg" alt="Vanguard" width={24} height={24} className="rounded" />
            <span className="font-bold">Vanguard</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-2">Security</h1>
        <p className="text-muted-foreground mb-8">
          Our commitment to keeping your data safe
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">Our Security Commitment</h2>
            <p className="text-muted-foreground">
              At Vanguard, security is foundational to everything we build. We understand that
              incident and emergency data requires the highest levels of protection, and we&apos;re
              committed to implementing industry best practices to safeguard your information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-6">Security Features</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {securityFeatures.map((feature) => (
                <Card key={feature.title} className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-base">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Data Protection</h2>
            <p className="text-muted-foreground mb-4">
              We implement multiple layers of protection:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>End-to-end encryption for all data transmission</li>
              <li>Encrypted storage for all persisted data</li>
              <li>Secure authentication with strong password requirements</li>
              <li>Session management with automatic timeout</li>
              <li>Rate limiting to prevent abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Third-Party Integrations</h2>
            <p className="text-muted-foreground">
              We carefully vet all third-party services we integrate with. Data shared with
              external services (such as PulsePoint or the National Weather Service) is limited
              to what&apos;s necessary for functionality, and all connections use secure protocols.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Reporting Security Issues</h2>
            <p className="text-muted-foreground">
              If you discover a security vulnerability, please report it responsibly. Contact
              information for security reports will be provided when the platform launches.
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
