import { useQuery } from '@tanstack/react-query';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { ChecklistCard } from '@/components/ChecklistCard';
import { Rocket, BookOpen, Users, Pen } from 'lucide-react';
import type { User } from '@repo/types';
import { hasRole } from '@/lib/hasRole';

export default function Onboarding() {
  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/me'],
  });

  // If user hasn't completed initial onboarding (no roles), show wizard
  // Note: Roles are set in the first step of onboarding, so if they exist, user has completed setup
  if (!user || !user.roles || user.roles.length === 0) {
    return <OnboardingWizard onComplete={() => window.location.reload()} />;
  }

  // Determine which checklists to show based on user role/status
  const showReaderChecklist = true; // All users are readers
  const showAuthorChecklist = hasRole(user, 'AUTHOR');
  const showHostChecklist = hasRole(user, 'CLUB_ADMIN') || hasRole(user, 'STAFF');

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8" data-testid="page-onboarding">
      {/* Page Header */}
      <div className="pb-8 border-b border-gray-200 dark:border-gray-700 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Rocket className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            Getting Started
          </h1>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Complete your onboarding checklists to unlock the full potential of the platform
        </p>
      </div>

      {/* Welcome Banner */}
      <div className="mb-8 rounded-xl border border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Welcome to the Book Club Platform!
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Follow the checklists below to set up your profile, join clubs, and start engaging with the community.
          Each completed step earns you points and unlocks new features.
        </p>
      </div>

      {/* Checklists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {showReaderChecklist && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Reader Journey
              </h2>
            </div>
            <ChecklistCard userType="READER_ONBOARDING" showTitle={false} />
          </div>
        )}

        {showAuthorChecklist && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Pen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Author Journey
              </h2>
            </div>
            <ChecklistCard userType="AUTHOR_ONBOARDING" showTitle={false} />
          </div>
        )}

        {showHostChecklist && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Host Journey
              </h2>
            </div>
            <ChecklistCard userType="HOST_ONBOARDING" showTitle={false} />
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="mt-12 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Need Help?
        </h2>
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>
            If you have any questions about getting started, check out our{' '}
            <a href="/help" className="text-blue-600 dark:text-blue-400 hover:underline">
              Help Center
            </a>{' '}
            or reach out to{' '}
            <a href="/support" className="text-blue-600 dark:text-blue-400 hover:underline">
              Support
            </a>
            .
          </p>
          <p>
            You can also explore the{' '}
            <a href="/discover" className="text-blue-600 dark:text-blue-400 hover:underline">
              Discover page
            </a>{' '}
            to find trending books, clubs, and pitches in the community.
          </p>
        </div>
      </div>
    </div>
  );
}
