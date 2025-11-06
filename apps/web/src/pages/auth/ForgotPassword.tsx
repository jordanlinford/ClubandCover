import { useState } from 'react';
import { Link } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Card, Button, Input } from '@repo/ui';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const resetMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error('Failed to send reset email');
      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      resetMutation.mutate(email);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-6">
            <div className="text-green-600 text-5xl mb-4" data-testid="icon-success">✓</div>
            <h1 className="text-2xl font-bold mb-2">Check Your Email</h1>
            <p className="text-gray-600 dark:text-gray-400">
              If an account exists with that email, we've sent password reset instructions.
            </p>
          </div>
          <div className="text-center text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p>Please check your inbox and spam folder.</p>
            <p>The reset link will expire in 1 hour.</p>
          </div>
          <div className="mt-6 text-center">
            <Link href="/auth/signin">
              <Button variant="secondary" data-testid="button-back-to-signin">Back to Sign In</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-2">Forgot Password</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              data-testid="input-email"
            />
          </div>

          {resetMutation.isError && (
            <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
              Failed to send reset email. Please try again.
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={resetMutation.isPending}
            data-testid="button-submit"
          >
            {resetMutation.isPending ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/auth/signin" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300" data-testid="link-back-to-signin">
            Back to Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
}
