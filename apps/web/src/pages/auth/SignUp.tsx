import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@repo/ui';
import { Input } from '@repo/ui';
import { Card } from '@repo/ui';

export function SignUpPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Mock signup - just navigate to home
    setTimeout(() => {
      console.log('Mock sign up:', { email, password, name });
      setLocation('/');
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Create Account</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
          Mock authentication (Supabase not configured)
        </p>
        
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
        
        <p className="mt-4 text-center text-sm">
          Already have an account?{' '}
          <a href="/auth/sign-in" className="text-blue-600 hover:underline" data-testid="link-signin">
            Sign in
          </a>
        </p>
      </Card>
    </div>
  );
}
