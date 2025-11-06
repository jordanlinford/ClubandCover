import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Card, Button } from '@repo/ui';

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(null);

  // Get token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    setToken(tokenParam);
  }, []);

  const verifyMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) throw new Error('Verification failed');
      return response.json();
    },
    onSuccess: () => {
      // Wait a moment to show success message, then redirect
      setTimeout(() => {
        setLocation('/');
      }, 3000);
    },
  });

  useEffect(() => {
    if (token && !verifyMutation.isPending && !verifyMutation.isSuccess && !verifyMutation.isError) {
      verifyMutation.mutate(token);
    }
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Email Verification</h1>
        
        <div className="text-center">
          {verifyMutation.isPending && (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" data-testid="icon-loading"></div>
              <p className="text-gray-600 dark:text-gray-400">Verifying your email...</p>
            </div>
          )}

          {verifyMutation.isSuccess && (
            <div className="space-y-4">
              <div className="text-green-600 text-5xl" data-testid="icon-success">✓</div>
              <div>
                <p className="font-semibold text-green-600">Email Verified!</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Your email has been successfully verified. Redirecting you to the app...
                </p>
              </div>
            </div>
          )}

          {verifyMutation.isError && (
            <div className="space-y-4">
              <div className="text-red-600 text-5xl" data-testid="icon-error">✕</div>
              <div>
                <p className="font-semibold text-red-600">Verification Failed</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {(verifyMutation.error as any)?.message || 'Invalid or expired verification token'}
                </p>
              </div>
              <Link href="/">
                <Button data-testid="button-home">Go to Home</Button>
              </Link>
            </div>
          )}

          {!token && !verifyMutation.isPending && (
            <div className="space-y-4">
              <div className="text-red-600 text-5xl" data-testid="icon-no-token">✕</div>
              <div>
                <p className="font-semibold text-red-600">No Verification Token</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  The verification link appears to be invalid. Please check your email for the correct link.
                </p>
              </div>
              <Link href="/">
                <Button data-testid="button-home">Go to Home</Button>
              </Link>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
