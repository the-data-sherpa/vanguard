import Link from 'next/link';
import Image from 'next/image';
import {
  Radio,
  CloudLightning,
  Shield,
  Users,
  BarChart3,
  MapPin,
  Bell,
  Lock,
  Zap,
  Building2,
  Clock,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { AuthButtons, HeroTagline } from '@/components/auth/AuthButtons';

const features = [
  {
    icon: Radio,
    title: 'Real-Time Incident Tracking',
    description:
      'Follow local incidents as they happen with live updates from PulsePoint and other sources.',
  },
  {
    icon: CloudLightning,
    title: 'Weather Alert Integration',
    description:
      'Automatic National Weather Service alerts for your area with severity tracking.',
  },
  {
    icon: Users,
    title: 'Community-Focused',
    description:
      'Built for communities who want to stay informed about local emergencies and incidents.',
  },
  {
    icon: Shield,
    title: 'Privacy First',
    description:
      'Your data stays secure with encryption and complete separation between communities.',
  },
  {
    icon: BarChart3,
    title: 'Incident Analytics',
    description:
      'Understand patterns in your area with visual dashboards and historical data.',
  },
  {
    icon: Bell,
    title: 'Social Media Updates',
    description:
      'Automatically share incident updates to Facebook, Twitter, and Discord to keep everyone informed.',
  },
];

const integrations = [
  { name: 'PulsePoint', description: 'Real-time CAD incident data' },
  { name: 'National Weather Service', description: 'Official weather alerts' },
  { name: 'Facebook', description: 'Community updates' },
  { name: 'Discord', description: 'Team coordination' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="Vanguard" width={32} height={32} className="rounded" />
              <span className="text-xl font-bold">Vanguard</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
              <Link href="#integrations" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Integrations
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <AuthButtons variant="nav" />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-blue-500/5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center space-y-8 max-w-4xl mx-auto">
            <Badge variant="secondary" className="px-4 py-1.5">
              <Zap className="h-3 w-3 mr-1.5 inline" />
              14-Day Free Trial — No Credit Card Required
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Community Incident Awareness
              <span className="block text-red-500">Stay Informed, Stay Safe</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Vanguard helps communities stay informed about local emergencies and incidents.
              Real-time tracking, weather alerts, and social updates — all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <AuthButtons variant="hero" />
            </div>
            <HeroTagline />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '99.9%', label: 'Uptime SLA' },
              { value: '<1s', label: 'Alert Latency' },
              { value: '256-bit', label: 'Encryption' },
              { value: '24/7', label: 'Monitoring' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Everything You Need</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for communities who want to stay connected and informed.
              Every feature designed to keep you in the know.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="border-0 shadow-none bg-muted/30">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Up and Running in Minutes</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get your organization set up quickly with our streamlined onboarding process.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: '1',
                title: 'Sign Up',
                description: 'Create your account and submit your organization details.',
                icon: Building2,
              },
              {
                step: '2',
                title: 'Quick Review',
                description: 'Our team reviews your request, typically within 24 hours.',
                icon: Clock,
              },
              {
                step: '3',
                title: 'Configure',
                description: 'Connect PulsePoint, set up weather zones, and customize your dashboard.',
                icon: Zap,
              },
              {
                step: '4',
                title: 'Go Live',
                description: 'Start monitoring with real-time incident and weather data.',
                icon: MapPin,
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold mb-6">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section id="integrations" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">
                Connects to the Tools You Already Use
              </h2>
              <p className="text-lg text-muted-foreground">
                Vanguard integrates with industry-standard data sources and communication platforms
                to fit seamlessly into your existing workflow.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {integrations.map((integration) => (
                  <div key={integration.name} className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <div className="font-medium">{integration.name}</div>
                      <div className="text-sm text-muted-foreground">{integration.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-video rounded-xl bg-gradient-to-br from-muted to-muted/50 border flex items-center justify-center">
                <div className="text-center p-8">
                  <MapPin className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Live incident map preview</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Lock, label: 'Data Encryption' },
                  { icon: Shield, label: 'Tenant Isolation' },
                  { icon: Users, label: 'Role-Based Access' },
                  { icon: BarChart3, label: 'Audit Logging' },
                ].map((item) => (
                  <div key={item.label} className="p-6 rounded-xl bg-background border text-center">
                    <item.icon className="h-8 w-8 mx-auto mb-3 text-primary" />
                    <div className="font-medium">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">
                Security You Can Trust
              </h2>
              <p className="text-lg text-muted-foreground">
                Your incident data is sensitive. Vanguard uses industry-leading security practices
                to ensure your information stays protected with complete tenant isolation.
              </p>
              <ul className="space-y-3">
                {[
                  'End-to-end encryption for all data in transit and at rest',
                  'Complete logical isolation between organizations',
                  'Comprehensive audit trail for compliance requirements',
                  'Regular security assessments and updates',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Simple, Transparent Pricing</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              One plan with everything you need. Start with a free trial, no credit card required.
            </p>
          </div>
          <div className="max-w-lg mx-auto">
            <Card className="relative overflow-hidden border-2 border-primary">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-sm font-medium rounded-bl-lg">
                14-Day Free Trial
              </div>
              <CardHeader className="text-center pt-8">
                <CardTitle className="text-2xl">Vanguard</CardTitle>
                <CardDescription className="text-base">
                  Everything you need for community incident awareness
                </CardDescription>
                <div className="mt-6">
                  <span className="text-5xl font-bold">$29</span>
                  <span className="text-2xl font-bold text-muted-foreground">.99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {[
                    'Real-time incident tracking from PulsePoint',
                    'National Weather Service alert integration',
                    'Customizable dashboard and incident views',
                    'Social media auto-posting (Facebook, Discord)',
                    'Unlimited team members',
                    'Role-based access control',
                    'Incident analytics and reporting',
                    'Email and chat support',
                  ].map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-4">
                  <Link href="/signup">
                    <Button className="w-full" size="lg">
                      Start Free Trial
                    </Button>
                  </Link>
                  <p className="text-sm text-muted-foreground text-center mt-3">
                    No credit card required. Cancel anytime.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to Keep Your Community Informed?
          </h2>
          <p className="text-xl opacity-90">
            Start your 14-day free trial today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <AuthButtons variant="cta" />
          </div>
          <p className="text-sm opacity-75">
            Questions? Contact us at support@vanguard.app
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4 w-fit">
                <Image src="/logo.png" alt="Vanguard" width={24} height={24} className="rounded" />
                <span className="font-bold">Vanguard</span>
              </Link>
              <p className="text-sm text-muted-foreground">
                Community incident awareness for neighborhoods and local areas.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#features" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link href="#integrations" className="hover:text-foreground transition-colors">Integrations</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                <li><Link href="/security" className="hover:text-foreground transition-colors">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-12 pt-8">
            <p className="text-sm text-muted-foreground text-center">
              &copy; {new Date().getFullYear()} Vanguard. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
