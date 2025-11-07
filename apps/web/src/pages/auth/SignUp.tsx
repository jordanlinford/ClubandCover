import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@repo/ui';
import { Input } from '@repo/ui';
import { Card } from '@repo/ui';
import { BookOpen, Pen } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function SignUpPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState<string>('');
  const [signupSuccess, setSignupSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    if (roleParam === 'READER' || roleParam === 'AUTHOR') {
      setRole(roleParam);
    } else {
      setLocation('/auth/role');
    }
  }, [setLocation]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!supabase) {
      setError('Supabase not configured - please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role } },
      });
      if (error) throw error;
      
      // Check if email confirmation is required
      if (data?.user && !data?.session) {
        // Email confirmation required
        setSignupSuccess(true);
        setLoading(false);
      } else if (data?.session) {
        // User is automatically signed in (email confirmation disabled)
        setLocation('/onboarding');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up');
      setLoading(false);
    }
  };

  if (!role) {
    return null;
  }

  const RoleIcon = role === 'READER' ? BookOpen : Pen;
  const roleName = role === 'READER' ? 'Reader' : 'Author';

  // Show success message if signup succeeded and email verification is required
  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <RoleIcon className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold mb-2">Check Your Email</h1>
              <p className="text-muted-foreground">
                We sent a verification link to <strong>{email}</strong>
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p className="mb-2">To complete your {roleName.toLowerCase()} account registration:</p>
              <ol className="list-decimal list-inside space-y-1 text-left">
                <li>Check your email inbox</li>
                <li>Click the verification link</li>
                <li>You'll be redirected to sign in</li>
              </ol>
            </div>
            <div className="pt-4">
              <a href="/auth/sign-in" className="text-primary hover:underline text-sm" data-testid="link-signin">
                Already verified? Sign in here
              </a>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <RoleIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Create Account</h1>
            <p className="text-sm text-muted-foreground">
              Signing up as {roleName}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/50 rounded-lg text-sm text-destructive" data-testid="text-error">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Name
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              data-testid="input-name"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              data-testid="input-email"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              data-testid="input-password"
            />
          </div>
          
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            data-testid="button-signup"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>
        
        <div className="mt-6 space-y-3">
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <a href="/auth/sign-in" className="text-primary hover:underline" data-testid="link-signin">
              Sign in
            </a>
          </p>
          <p className="text-center text-sm text-muted-foreground">
            Want to sign up as {role === 'READER' ? 'an Author' : 'a Reader'}?{' '}
            <a href="/auth/role" className="text-primary hover:underline" data-testid="link-change-role">
              Change role
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}
