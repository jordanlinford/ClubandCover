import { Link } from 'wouter';
import { Button } from '@repo/ui';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-primary mb-4">404</h1>
        <p className="text-2xl text-muted-foreground mb-8">Page not found</p>
        <Link href="/">
          <Button size="lg" data-testid="button-home">Go Home</Button>
        </Link>
      </div>
    </div>
  );
}
