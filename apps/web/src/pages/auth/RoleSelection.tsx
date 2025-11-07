import { useLocation } from 'wouter';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { BookOpen, Pen, Check } from 'lucide-react';

export function RoleSelectionPage() {
  const [, setLocation] = useLocation();

  const roles = [
    {
      value: 'READER',
      label: 'Reader',
      description: 'Join clubs, vote on books, and earn points',
      features: [
        'Join unlimited book clubs',
        'Vote on club selections',
        'Earn points and badges',
        'Participate in discussions',
      ],
      icon: BookOpen,
      badge: 'Always Free',
      buttonText: 'Continue as Reader',
    },
    {
      value: 'AUTHOR',
      label: 'Author',
      description: 'Pitch books to clubs and access AuthorSwap network',
      features: [
        'Pitch books to clubs',
        'AuthorSwap network access',
        'Author analytics dashboard',
        'Upgrade for advanced features',
      ],
      icon: Pen,
      badge: 'Free to Start',
      buttonText: 'Continue as Author',
    },
  ];

  const handleRoleSelection = (role: string) => {
    setLocation(`/auth/sign-up?role=${role}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-semibold tracking-tight mb-3">
            Welcome to Book Pitch
          </h1>
          <p className="text-lg text-muted-foreground">
            Choose how you'd like to join the community
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Card key={role.value} className="p-6">
                <div className="mb-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h2 className="text-2xl font-semibold">{role.label}</h2>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {role.badge}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{role.description}</p>
                </div>

                <div className="space-y-3 mb-6">
                  {role.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => handleRoleSelection(role.value)}
                  className="w-full"
                  variant={role.value === 'AUTHOR' ? 'default' : 'outline'}
                  data-testid={`button-select-${role.value.toLowerCase()}`}
                >
                  {role.buttonText}
                </Button>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Already have an account?{' '}
          <a href="/auth/sign-in" className="text-primary hover:underline" data-testid="link-signin">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
