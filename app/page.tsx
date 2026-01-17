import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-4xl font-bold">Vanguard</h1>
        <p className="text-muted-foreground text-lg">
          Multi-tenant Emergency Incident Management
        </p>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Development mode - visit a tenant dashboard:
          </p>
          <Link
            href="/tenant/test"
            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Go to Test Tenant Dashboard
          </Link>
        </div>
        <div className="pt-8 text-xs text-muted-foreground">
          <p>To set up the database, run:</p>
          <code className="block mt-2 p-2 bg-muted rounded">npm run db:init</code>
        </div>
      </div>
    </div>
  );
}
