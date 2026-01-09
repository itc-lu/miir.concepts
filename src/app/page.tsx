import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Film,
  Building2,
  Calendar,
  FileInput,
  FileOutput,
  Globe,
  ArrowRight,
} from 'lucide-react';

const features = [
  {
    icon: FileInput,
    title: 'Automated Data Import',
    description:
      'Import cinema data from multiple sources including Excel files, XML, and APIs automatically.',
  },
  {
    icon: Film,
    title: 'Movie Management',
    description:
      'Three-layer movie architecture (L0/L1/L2) for comprehensive metadata management.',
  },
  {
    icon: Building2,
    title: 'Cinema Network',
    description: 'Manage multiple cinema groups and locations with individual configurations.',
  },
  {
    icon: Calendar,
    title: 'Session Scheduling',
    description: 'Schedule and manage movie sessions with an intuitive wizard interface.',
  },
  {
    icon: FileOutput,
    title: 'Custom Exports',
    description: 'Generate customized XML exports tailored to each client\'s requirements.',
  },
  {
    icon: Globe,
    title: 'Multi-Language Support',
    description: 'Full support for Luxembourg\'s multilingual environment (LU, FR, DE, EN).',
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Film className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">CAT</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-24 sm:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Cinema Automation Tool
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Streamline your cinema program management with automated data collection, processing,
            and distribution. Built for Luxembourg&apos;s media landscape.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-24 sm:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to manage cinema programs
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A comprehensive suite of tools designed for media companies and cinema operators.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(feature => (
            <Card key={feature.title} className="relative overflow-hidden">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/50">
        <div className="container py-24 sm:py-32">
          <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">10+</div>
              <div className="mt-2 text-sm text-muted-foreground">Cinema Parsers</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">4</div>
              <div className="mt-2 text-sm text-muted-foreground">Languages Supported</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">100%</div>
              <div className="mt-2 text-sm text-muted-foreground">Automation Ready</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-24 sm:py-32">
        <div className="mx-auto max-w-2xl rounded-2xl bg-primary p-8 text-center sm:p-12">
          <h2 className="text-2xl font-bold text-primary-foreground sm:text-3xl">
            Ready to automate your cinema program?
          </h2>
          <p className="mt-4 text-primary-foreground/80">
            Join media companies across Luxembourg who trust CAT for their cinema schedules.
          </p>
          <div className="mt-8">
            <Link href="/register">
              <Button size="lg" variant="secondary">
                Get Started Today
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container py-12">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Film className="h-6 w-6 text-primary" />
              <span className="font-semibold">CAT</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} miir.concepts. All rights reserved.
            </p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                Terms
              </Link>
              <Link href="/contact" className="hover:text-foreground">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
