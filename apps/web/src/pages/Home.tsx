import { Link } from 'wouter';
import { Button, Card, CardTitle, CardDescription } from '@repo/ui';
import { BookOpen, Users, TrendingUp, Award, Zap, Heart } from 'lucide-react';

export function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-tight mb-6">
              Connect authors and readers through community-driven discovery
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Book Pitch is where authors find their audience and readers discover their next favorite book
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/auth/sign-up">
                <Button size="lg" data-testid="button-get-started">
                  Get Started
                </Button>
              </Link>
              <Link href="/auth/sign-in">
                <Button size="lg" variant="outline" data-testid="button-signin">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Reader vs Author Paths */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Reader Path */}
          <Card className="p-8">
            <div className="mb-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl mb-2">For Readers</CardTitle>
              <CardDescription className="text-base">
                Discover great books and join vibrant reading communities
              </CardDescription>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex gap-3">
                <Users className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium mb-1">Join Book Clubs</p>
                  <p className="text-sm text-muted-foreground">
                    Find communities that match your reading interests
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <TrendingUp className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium mb-1">Vote on Books</p>
                  <p className="text-sm text-muted-foreground">
                    Help clubs choose their next read and earn rewards
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Award className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium mb-1">Earn Points & Badges</p>
                  <p className="text-sm text-muted-foreground">
                    Get rewarded for your participation and engagement
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold">Always Free</p>
                <Link href="/auth/sign-up">
                  <Button variant="outline" data-testid="button-reader-signup">
                    Sign Up as Reader
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* Author Path */}
          <Card className="p-8 border-primary/50">
            <div className="mb-6">
              <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl mb-2">For Authors</CardTitle>
              <CardDescription className="text-base">
                Pitch your books directly to engaged readers and clubs
              </CardDescription>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex gap-3">
                <Heart className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium mb-1">Pitch to Clubs</p>
                  <p className="text-sm text-muted-foreground">
                    Submit your books directly to book clubs for consideration
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Users className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium mb-1">AuthorSwap Network</p>
                  <p className="text-sm text-muted-foreground">
                    Exchange books with other authors for reviews (FREE tier included)
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <TrendingUp className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium mb-1">Boost Visibility</p>
                  <p className="text-sm text-muted-foreground">
                    Promote your pitches and track analytics (Pro features)
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">Free to Start</p>
                  <p className="text-xs text-muted-foreground">Upgrade for advanced features</p>
                </div>
                <Link href="/auth/sign-up">
                  <Button data-testid="button-author-signup">
                    Sign Up as Author
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* How It Works */}
      <div className="border-t bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold mb-4">How It Works</h2>
            <p className="text-muted-foreground">
              Simple steps to connect authors and readers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-semibold text-primary">1</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Choose Your Path</h3>
              <p className="text-muted-foreground">
                Sign up as a reader to discover books or as an author to pitch your work
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-semibold text-primary">2</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Engage & Discover</h3>
              <p className="text-muted-foreground">
                Readers join clubs and vote. Authors pitch books and connect with communities
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-semibold text-primary">3</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Earn Rewards</h3>
              <p className="text-muted-foreground">
                Everyone earns points and badges for participation and engagement
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="border-t">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-semibold mb-4">
            Ready to get started?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of readers and authors discovering books together
          </p>
          <Link href="/auth/sign-up">
            <Button size="lg" data-testid="button-cta-signup">
              Create Your Free Account
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
