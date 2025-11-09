import { useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button, Card, CardTitle, CardDescription } from '@repo/ui';
import {
  BookOpen,
  Users,
  TrendingUp,
  Award,
  Zap,
  Send,
  Vote,
  MessageSquare,
  Star,
  BarChart3,
  Check,
  ArrowRight,
  Globe,
  Settings,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import logoUrl from '../assets/club-and-cover-logo.png';

export function LandingPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title = 'Club & Cover - Connect New Authors with Book Clubs';
  }, []);

  useEffect(() => {
    if (!loading && user) {
      setLocation('/discover');
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return null;
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <HeroSection />

      {/* Three User Types */}
      <UserTypesSection />

      {/* How It Works */}
      <HowItWorksSection />

      {/* Key Features Grid */}
      <FeaturesSection />

      {/* Pricing Section */}
      <PricingSection />

      {/* Final CTA */}
      <CTASection />

      {/* Footer */}
      <Footer />
    </div>
  );
}

function HeroSection() {
  return (
    <div className="relative border-b overflow-hidden">
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div className="max-w-7xl mx-auto px-6 py-20 md:py-24 relative">
        <div className="text-center max-w-4xl mx-auto">
          <div className="mb-8 flex justify-center">
            <img
              src={logoUrl}
              alt="Club & Cover Logo"
              className="h-20 md:h-24 w-auto"
              data-testid="img-logo"
            />
          </div>
          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-tight mb-6">
            Club & Cover
          </h1>
          <p className="text-2xl md:text-3xl font-semibold tracking-tight mb-4 text-foreground">
            Connect New Authors with Book Clubs
          </p>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            A three-sided marketplace where authors pitch to clubs, readers discover new voices, and club admins curate engaging content for their communities.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/auth/sign-up">
              <Button size="lg" data-testid="button-start-pitching">
                <Zap className="w-4 h-4 mr-2" />
                Start Pitching
              </Button>
            </Link>
            <Link href="/clubs">
              <Button size="lg" variant="outline" data-testid="button-join-club">
                <Users className="w-4 h-4 mr-2" />
                Join a Club
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserTypesSection() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* For Authors */}
        <Card data-testid="card-authors">
          <div className="mb-6">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <CardTitle className="mb-2">For Authors</CardTitle>
            <CardDescription>
              Pitch your book to entire book clubs at once. Get multiple reviews and word-of-mouth.
            </CardDescription>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Reach Groups, Not Individuals</p>
                <p className="text-sm text-muted-foreground">
                  One pitch reaches an entire book club community
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Verified Reviews</p>
                <p className="text-sm text-muted-foreground">
                  Get genuine reviews on Goodreads and Amazon
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">AuthorSwap Network</p>
                <p className="text-sm text-muted-foreground">
                  Exchange books with other authors for free
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* For Readers */}
        <Card data-testid="card-readers">
          <div className="mb-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="mb-2">For Readers</CardTitle>
            <CardDescription>
              Discover new authors and earn rewards for your participation.
            </CardDescription>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Always Free</p>
                <p className="text-sm text-muted-foreground">
                  No cost to join clubs and discover books
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Earn Points for Prizes</p>
                <p className="text-sm text-muted-foreground">
                  Get rewarded for reviews and engagement
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Participate in Selection</p>
                <p className="text-sm text-muted-foreground">
                  Vote on what your club reads next
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Join Vibrant Communities</p>
                <p className="text-sm text-muted-foreground">
                  Connect with fellow book lovers
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* For Club Admins */}
        <Card data-testid="card-admins">
          <div className="mb-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Settings className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="mb-2">For Club Admins</CardTitle>
            <CardDescription>
              Curate fresh content and keep your members engaged.
            </CardDescription>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Access Pitch Library</p>
                <p className="text-sm text-muted-foreground">
                  Browse curated author submissions
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Poll-Based Selection</p>
                <p className="text-sm text-muted-foreground">
                  Let members vote on upcoming reads
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Member Engagement Tools</p>
                <p className="text-sm text-muted-foreground">
                  Keep your community active and excited
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function HowItWorksSection() {
  return (
    <div className="border-t bg-muted/30">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground">
            A simple four-step process from pitch to review
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-primary" />
            </div>
            <div className="mb-2">
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
                Step 1
              </span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Author Pitches</h3>
            <p className="text-muted-foreground">
              Authors submit their books to clubs that match their genre
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <div className="mb-2">
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
                Step 2
              </span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Club Nominates</h3>
            <p className="text-muted-foreground">
              Admins review pitches and nominate favorites for voting
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Vote className="w-8 h-8 text-primary" />
            </div>
            <div className="mb-2">
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
                Step 3
              </span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Members Vote</h3>
            <p className="text-muted-foreground">
              Club members vote on which book to read next
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
            <div className="mb-2">
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
                Step 4
              </span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Club Reads & Reviews</h3>
            <p className="text-muted-foreground">
              Members read, discuss, and leave verified reviews
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturesSection() {
  return (
    <div className="border-t">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            Key Features
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to connect authors and readers
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">AuthorSwap Network</h3>
                <p className="text-sm text-muted-foreground">
                  Exchange books with other authors to build your review portfolio
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Vote className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Poll-Based Selection</h3>
                <p className="text-sm text-muted-foreground">
                  Democratic voting system for choosing club reads
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Star className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">External Review Integration</h3>
                <p className="text-sm text-muted-foreground">
                  Link verified reviews to Goodreads and Amazon
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Award className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Points & Badges</h3>
                <p className="text-sm text-muted-foreground">
                  Gamified rewards system to boost engagement
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Club Discovery</h3>
                <p className="text-sm text-muted-foreground">
                  Find and join clubs that match your reading interests
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
                <p className="text-sm text-muted-foreground">
                  Track your pitch performance and engagement metrics
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PricingSection() {
  return (
    <div className="border-t bg-muted/30">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground">
            Readers are always free. Authors choose the plan that works for them.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* FREE Tier */}
          <Card data-testid="card-pricing-free">
            <div className="text-center pb-4 border-b mb-4">
              <h3 className="text-2xl font-semibold mb-2">FREE</h3>
              <div className="mb-4">
                <span className="text-4xl font-semibold">$0</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <p className="text-sm text-muted-foreground">Perfect for readers and new authors</p>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex gap-2 text-sm">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Join unlimited clubs</span>
              </div>
              <div className="flex gap-2 text-sm">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Vote on book selections</span>
              </div>
              <div className="flex gap-2 text-sm">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>AuthorSwap network access</span>
              </div>
              <div className="flex gap-2 text-sm">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Earn points and badges</span>
              </div>
              <div className="flex gap-2 text-sm">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>3 pitches per month</span>
              </div>
            </div>
            <Link href="/auth/sign-up">
              <Button variant="outline" className="w-full" data-testid="button-pricing-free">
                Get Started Free
              </Button>
            </Link>
          </Card>

          {/* PRO Tier */}
          <Card className="border-primary/50" data-testid="card-pricing-pro">
            <div className="text-center pb-4 border-b mb-4">
              <div className="inline-block px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium mb-2">
                MOST POPULAR
              </div>
              <h3 className="text-2xl font-semibold mb-2">PRO</h3>
              <div className="mb-4">
                <span className="text-4xl font-semibold">$9.99</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <p className="text-sm text-muted-foreground">For serious indie authors</p>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex gap-2 text-sm">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Everything in FREE</span>
              </div>
              <div className="flex gap-2 text-sm">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Unlimited pitches</span>
              </div>
              <div className="flex gap-2 text-sm">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Pitch boosting</span>
              </div>
              <div className="flex gap-2 text-sm">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Analytics dashboard</span>
              </div>
              <div className="flex gap-2 text-sm">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Priority support</span>
              </div>
            </div>
            <Link href="/auth/sign-up">
              <Button className="w-full" data-testid="button-pricing-pro">
                Start Pro Trial
              </Button>
            </Link>
          </Card>

          {/* PUBLISHER Tier */}
          <Card data-testid="card-pricing-publisher">
            <div className="text-center pb-4 border-b mb-4">
              <h3 className="text-2xl font-semibold mb-2">PUBLISHER</h3>
              <div className="mb-4">
                <span className="text-4xl font-semibold">$49.99</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <p className="text-sm text-muted-foreground">For publishing houses</p>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex gap-2 text-sm">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Everything in PRO</span>
              </div>
              <div className="flex gap-2 text-sm">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Multiple author accounts</span>
              </div>
              <div className="flex gap-2 text-sm">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Advanced analytics</span>
              </div>
              <div className="flex gap-2 text-sm">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Bulk pitch management</span>
              </div>
              <div className="flex gap-2 text-sm">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>White-label options</span>
              </div>
            </div>
            <Link href="/auth/sign-up">
              <Button variant="outline" className="w-full" data-testid="button-pricing-publisher">
                Contact Sales
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CTASection() {
  return (
    <div className="border-t">
      <div className="max-w-4xl mx-auto px-6 py-16 md:py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
          Get Started Today
        </h2>
        <p className="text-lg text-muted-foreground mb-8">
          Join the community connecting authors with their perfect readers. No credit card required.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/auth/sign-up">
            <Button size="lg" data-testid="button-cta-signup">
              Create Free Account
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/discover">
            <Button size="lg" variant="outline" data-testid="button-cta-discover">
              Browse Clubs
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="border-t bg-muted/30">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/discover">
                  <a className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-footer-discover">
                    Discover Clubs
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/pitches">
                  <a className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-footer-pitches">
                    Browse Pitches
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/billing">
                  <a className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-footer-pricing">
                    Pricing
                  </a>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-footer-help">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-footer-guides">
                  Author Guides
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-footer-blog">
                  Blog
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-footer-about">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-footer-contact">
                  Contact
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-footer-careers">
                  Careers
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-footer-privacy">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-footer-terms">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-footer-cookies">
                  Cookie Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Club & Cover. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
