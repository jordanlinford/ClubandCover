import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { BookOpen, Pen, Users, Check } from 'lucide-react';
import { api } from '../lib/api';

const AVAILABLE_GENRES = [
  'Fiction',
  'Non-Fiction',
  'Mystery',
  'Thriller',
  'Romance',
  'Sci-Fi',
  'Fantasy',
  'Biography',
  'History',
  'Self-Help',
  'Poetry',
  'Young Adult',
  'Horror',
  'Literary Fiction',
];

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<'role' | 'profile'>('role');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [booksPerMonth, setBooksPerMonth] = useState<number>(2);
  const [bio, setBio] = useState<string>('');
  const [error, setError] = useState<string>('');
  const queryClient = useQueryClient();

  const setRoleMutation = useMutation({
    mutationFn: (role: string) =>
      api.post('/onboarding/role', { role }),
    onSuccess: () => {
      setError('');
      setStep('profile');
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to set role');
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: { genres: string[]; booksPerMonth: number; bio?: string }) =>
      api.patch('/onboarding/profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      setError('');
      onComplete();
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to update profile');
    },
  });

  const roles = [
    {
      value: 'READER',
      label: 'Reader',
      description: 'Join clubs, vote on books, and participate in discussions',
      icon: BookOpen,
    },
    {
      value: 'AUTHOR',
      label: 'Author',
      description: 'Pitch your books to clubs and earn points from reader engagement',
      icon: Pen,
    },
    {
      value: 'CLUB_ADMIN',
      label: 'Club Host',
      description: 'Create and manage book clubs, run polls, and build community',
      icon: Users,
    },
  ];

  const handleRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      setError('Please select a role');
      return;
    }
    setRoleMutation.mutate(selectedRole);
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGenres.length === 0) {
      setError('Please select at least one genre');
      return;
    }
    updateProfileMutation.mutate({
      genres: selectedGenres,
      booksPerMonth,
      bio: bio || undefined,
    });
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  if (step === 'role') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-2xl p-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">Welcome to Club & Cover</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Let's set up your account. First, choose your role:
          </p>

          {error && (
            <div
              className="mb-6 p-4 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-md"
              data-testid="text-error"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleRoleSubmit} className="space-y-4">
            <div className="grid gap-4">
              {roles.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.value;
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setSelectedRole(role.value)}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    data-testid={`button-role-${role.value.toLowerCase()}`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-lg ${
                          isSelected
                            ? 'bg-blue-100 dark:bg-blue-800/30'
                            : 'bg-gray-100 dark:bg-gray-800'
                        }`}
                      >
                        <Icon
                          className={`h-6 w-6 ${
                            isSelected
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{role.label}</h3>
                          {isSelected && (
                            <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {role.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={!selectedRole || setRoleMutation.isPending}
              data-testid="button-continue-role"
            >
              {setRoleMutation.isPending ? 'Saving...' : 'Continue'}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-2xl p-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">Tell us about your reading preferences</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          This helps us recommend clubs and books you'll love.
        </p>

        {error && (
          <div
            className="mb-6 p-4 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-md"
            data-testid="text-error"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
              Favorite Genres <span className="text-red-500">*</span>
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Select at least one genre you enjoy
            </p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_GENRES.map((genre) => {
                const isSelected = selectedGenres.includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
                    }`}
                    data-testid={`badge-genre-${genre.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
              Books per Month
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              How many books do you typically read each month?
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="10"
                value={booksPerMonth}
                onChange={(e) => setBooksPerMonth(Number(e.target.value))}
                className="flex-1"
                data-testid="input-books-per-month"
              />
              <span className="font-semibold w-8 text-center text-gray-900 dark:text-gray-100">{booksPerMonth}</span>
            </div>
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
              Bio (Optional)
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Tell us a bit about yourself and your reading interests
            </p>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="I love epic fantasy novels and cozy mysteries..."
              rows={4}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              data-testid="input-bio"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={updateProfileMutation.isPending}
            data-testid="button-complete-onboarding"
          >
            {updateProfileMutation.isPending ? 'Saving...' : 'Complete Setup'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
