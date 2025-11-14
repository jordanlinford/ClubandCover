import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function SuspendedBanner() {
  const { accountStatus } = useAuth();

  if (accountStatus !== 'SUSPENDED') {
    return null;
  }

  return (
    <div 
      className="bg-red-600 dark:bg-red-700 text-white py-3 px-4 flex items-center justify-center gap-3"
      data-testid="banner-suspended"
    >
      <AlertTriangle className="h-5 w-5 flex-shrink-0" />
      <div className="text-center">
        <p className="font-semibold">
          Your account has been suspended
        </p>
        <p className="text-sm opacity-90">
          You can still browse the platform but cannot create content, join clubs, or participate in activities. 
          Please contact support for more information.
        </p>
      </div>
    </div>
  );
}
