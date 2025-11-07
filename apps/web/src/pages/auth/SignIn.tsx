import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@repo/ui';
import { Input } from '@repo/ui';
import { Card } from '@repo/ui';
import { supabase } from '../../lib/supabase';

export function SignInPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!supabase) {
      setError('Supabase not configured - please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setLocation('/discover');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold mb-6 text-center">Sign In</h1>
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/50 rounded-lg text-sm text-destructive" data-testid="text-error">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSignIn} className="space-y-4">
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
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-medium">
                Password
              </label>
              <a href="/auth/forgot-password" className="text-xs text-primary hover:underline" data-testid="link-forgot-password">
                Forgot password?
              </a>
            </div>
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
            data-testid="button-signin"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
        
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <a href="/auth/role" className="text-primary hover:underline" data-testid="link-signup">
            Sign up
          </a>
        </p>
      </Card>
    </div>
  );
}
