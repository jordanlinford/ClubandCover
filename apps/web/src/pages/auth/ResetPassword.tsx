import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Card, Button, Input } from '@repo/ui';

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  // Get token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    setToken(tokenParam);
  }, []);

  // Verify token on load
  const verifyTokenMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await fetch('/api/auth/verify-reset-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) throw new Error('Invalid token');
      return response.json();
    },
    onSuccess: () => {
      setTokenValid(true);
    },
    onError: () => {
      setTokenValid(false);
    },
  });

  useEffect(() => {
    if (token) {
      verifyTokenMutation.mutate(token);
    }
  }, [token]);

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('No token provided');
      if (newPassword.length < 8) throw new Error('Password must be at least 8 characters');
      if (newPassword !== confirmPassword) throw new Error("Passwords don't match");

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reset password');
      }
      return response.json();
    },
    onSuccess: () => {
      setResetSuccess(true);
      setTimeout(() => {
        setLocation('/auth/signin');
      }, 3000);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to reset password');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    resetMutation.mutate();
  };

  // Loading state
  if (!token || tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" data-testid="icon-loading"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Verifying reset link...</p>
        </Card>
      </div>
    );
  }

  // Invalid token
  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-6">
            <div className="text-red-600 text-5xl mb-4" data-testid="icon-error">✕</div>
            <h1 className="text-2xl font-bold mb-2">Invalid Reset Link</h1>
            <p className="text-gray-600 dark:text-gray-400">
              This password reset link is invalid or has expired.
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <Link href="/auth/forgot-password">
              <Button variant="secondary" data-testid="button-forgot-password">Request New Link</Button>
            </Link>
            <Link href="/auth/signin">
              <Button data-testid="button-signin">Sign In</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Success state
  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <div className="text-green-600 text-5xl mb-4" data-testid="icon-success">✓</div>
            <h1 className="text-2xl font-bold mb-2">Password Reset Successful</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Your password has been reset successfully. Redirecting to sign in...
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Reset form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-2">Reset Password</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Enter your new password below.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium mb-2">
              New Password
            </label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              data-testid="input-password"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
              Confirm Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              data-testid="input-confirm-password"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400" data-testid="text-error">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={resetMutation.isPending}
            data-testid="button-submit"
          >
            {resetMutation.isPending ? 'Resetting...' : 'Reset Password'}
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
