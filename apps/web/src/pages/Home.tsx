import { Link } from 'react-router-dom';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@repo/ui';

export function HomePage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-none mb-4">
            pnpm Monorepo
          </h1>
          <p className="text-lg text-muted-foreground">
            React 18 + Vite + TypeScript + Tailwind + React Router + Supabase
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Web App</CardTitle>
              <CardDescription>
                Built with React 18, Vite, and TypeScript
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>✓ React Router v7</li>
                <li>✓ Tailwind CSS</li>
                <li>✓ Supabase Auth</li>
                <li>✓ Shared UI Components</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Server</CardTitle>
              <CardDescription>
                Fastify + Prisma + Zod validation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>✓ Fastify Framework</li>
                <li>✓ Prisma ORM</li>
                <li>✓ Stripe Integration</li>
                <li>✓ JWT Auth Middleware</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shared Packages</CardTitle>
              <CardDescription>
                Reusable code across workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>✓ @repo/types</li>
                <li>✓ @repo/ui</li>
                <li>✓ @repo/config</li>
                <li>✓ TypeScript Project References</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Link to="/users">
            <Button size="lg">View Users Example</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
