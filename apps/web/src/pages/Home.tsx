import { Link } from 'wouter';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@repo/ui';

export function HomePage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-none mb-4">
            Book Club & Swap
          </h1>
          <p className="text-lg text-muted-foreground">
            Share, swap, and discover books with your community
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/books">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Books</CardTitle>
                <CardDescription>
                  Browse and manage your book collection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" data-testid="button-books">View Books</Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/clubs">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Book Clubs</CardTitle>
                <CardDescription>
                  Join or create book clubs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" data-testid="button-clubs">View Clubs</Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/swaps">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>My Swaps</CardTitle>
                <CardDescription>
                  Manage your book swap requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" data-testid="button-swaps">View Swaps</Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="mt-12 text-center flex justify-center gap-4">
          <Link href="/auth/sign-in">
            <Button variant="outline" data-testid="button-signin">Sign In</Button>
          </Link>
          <Link href="/profile">
            <Button data-testid="button-profile">My Profile</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
