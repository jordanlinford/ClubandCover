import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@repo/ui';
import { Input } from '@repo/ui';
import { Card } from '@repo/ui';

export function SignInPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Mock login - just navigate to home
    setTimeout(() => {
      console.log('Mock sign in:', { email, password });
      setLocation('/');
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign In</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
          Mock authentication (Supabase not configured)
        </p>
        
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
            data-testid="button-signin"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
        
        <p className="mt-4 text-center text-sm">
          Don't have an account?{' '}
          <a href="/auth/sign-up" className="text-blue-600 hover:underline" data-testid="link-signup">
            Sign up
          </a>
        </p>
      </Card>
    </div>
  );
}
