import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, Input } from '@repo/ui';
import { Loader2, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { BOOK_GENRES } from '@repo/types';

const profileSchema = z.object({
  penName: z.string().max(100).optional().or(z.literal('')),
  bio: z.string().min(50, 'Bio must be at least 50 characters').max(5000),
  genres: z.array(z.string()).min(1, 'Select at least one genre').max(5, 'Maximum 5 genres'),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

const verificationSchema = z.object({
  type: z.enum(['AMAZON_LINK', 'GOODREADS_LINK', 'PUBLISHER_PAGE', 'ISBN', 'OTHER']),
  value: z.string().min(1, 'Proof value is required'),
  notes: z.string().max(1000).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type VerificationFormData = z.infer<typeof verificationSchema>;

export default function AuthorVerification() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'profile' | 'verification'>('profile');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: profileResponse, isLoading: profileLoading } = useQuery<{ success: boolean; data: any }>({
    queryKey: ['/api/author-profiles'],
    retry: false,
  });

  const profile = profileResponse?.data;

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
    setValue: setProfileValue,
    watch: watchProfile,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      penName: '',
      bio: '',
      genres: [],
      website: '',
    },
  });

  const {
    register: registerVerification,
    handleSubmit: handleSubmitVerification,
    formState: { errors: verificationErrors },
  } = useForm<VerificationFormData>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      type: 'GOODREADS_LINK',
      value: '',
      notes: '',
    },
  });

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setProfileValue('penName', profile.penName || '');
      setProfileValue('bio', profile.bio || '');
      setProfileValue('genres', profile.genres || []);
      setProfileValue('website', profile.website || '');
    }
  }, [profile, setProfileValue]);

  const selectedGenres = watchProfile('genres') || [];

  const saveProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await fetch('/api/author-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save profile');
      }
      return response.json();
    },
    onSuccess: () => {
      setSuccess('Profile saved successfully');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['/api/author-profiles'] });
      if (profile?.verificationStatus === 'UNVERIFIED') {
        setStep('verification');
      }
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess('');
    },
  });

  const submitVerificationMutation = useMutation({
    mutationFn: async (data: VerificationFormData) => {
      const response = await fetch('/api/author-profiles/submit-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit verification');
      }
      return response.json();
    },
    onSuccess: () => {
      setSuccess('Verification submitted for review');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['/api/author-profiles'] });
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess('');
    },
  });

  const addGenre = (genre: string) => {
    if (!selectedGenres.includes(genre) && selectedGenres.length < 5) {
      setProfileValue('genres', [...selectedGenres, genre]);
    }
  };

  const removeGenre = (genre: string) => {
    setProfileValue('genres', selectedGenres.filter((g) => g !== genre));
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" data-testid="loader-verification" />
      </div>
    );
  }

  const verificationStatus = profile?.verificationStatus || 'UNVERIFIED';
  const canSubmitVerification = verificationStatus !== 'PENDING' && verificationStatus !== 'VERIFIED';

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Author Verification</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Complete your author profile and submit verification to publish pitches and participate in swaps.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg">
          {success}
        </div>
      )}

      {/* Status Card */}
      {profile && (
        <Card className="mb-8 p-6">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-xl font-semibold">Verification Status</h2>
            {verificationStatus === 'VERIFIED' && <CheckCircle className="w-5 h-5 text-green-600" data-testid="icon-verified" />}
            {verificationStatus === 'PENDING' && <Clock className="w-5 h-5 text-yellow-600" data-testid="icon-pending" />}
            {verificationStatus === 'REJECTED' && <XCircle className="w-5 h-5 text-red-600" data-testid="icon-rejected" />}
            {verificationStatus === 'UNVERIFIED' && <AlertCircle className="w-5 h-5 text-gray-600" data-testid="icon-unverified" />}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                verificationStatus === 'VERIFIED'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : verificationStatus === 'PENDING'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}
              data-testid={`status-${verificationStatus.toLowerCase()}`}
            >
              {verificationStatus}
            </span>
            {verificationStatus === 'VERIFIED' && profile.verifiedAt && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Verified on {new Date(profile.verifiedAt).toLocaleDateString()}
              </p>
            )}
            {verificationStatus === 'REJECTED' && profile.rejectionReason && (
              <p className="text-sm text-red-600 dark:text-red-400">{profile.rejectionReason}</p>
            )}
          </div>
        </Card>
      )}

      {/* Profile Form */}
      {step === 'profile' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Author Profile</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Tell us about yourself and your writing.</p>

          <form onSubmit={handleSubmitProfile((data) => saveProfileMutation.mutate(data))} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Pen Name (optional)</label>
              <Input
                {...registerProfile('penName')}
                placeholder="Your pen name"
                data-testid="input-penname"
              />
              {profileErrors.penName && (
                <p className="text-sm text-red-600 mt-1">{profileErrors.penName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Bio *</label>
              <textarea
                {...registerProfile('bio')}
                placeholder="Tell us about your writing background, published works, and what makes you a unique author..."
                rows={5}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                data-testid="input-bio"
              />
              {profileErrors.bio && (
                <p className="text-sm text-red-600 mt-1">{profileErrors.bio.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Genres (select 1-5) *</label>
              <select
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                onChange={(e) => addGenre(e.target.value)}
                value=""
                data-testid="select-genres"
              >
                <option value="">Select a genre</option>
                {BOOK_GENRES.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedGenres.map((genre) => (
                  <span
                    key={genre}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-sm cursor-pointer"
                    onClick={() => removeGenre(genre)}
                    data-testid={`badge-genre-${genre.toLowerCase()}`}
                  >
                    {genre} ×
                  </span>
                ))}
              </div>
              {profileErrors.genres && (
                <p className="text-sm text-red-600 mt-1">{profileErrors.genres.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Website (optional)</label>
              <Input
                {...registerProfile('website')}
                type="url"
                placeholder="https://yourwebsite.com"
                data-testid="input-website"
              />
              {profileErrors.website && (
                <p className="text-sm text-red-600 mt-1">{profileErrors.website.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={saveProfileMutation.isPending}
              data-testid="button-save-profile"
            >
              {saveProfileMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Profile
            </Button>

            {canSubmitVerification && profile && (
              <Button
                type="button"
                onClick={() => setStep('verification')}
                className="ml-2"
                data-testid="button-next-verification"
              >
                Next: Submit Verification
              </Button>
            )}
          </form>
        </Card>
      )}

      {/* Verification Form */}
      {step === 'verification' && canSubmitVerification && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Submit Verification Proof</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Provide proof of your published works to verify your author status.
          </p>

          <form onSubmit={handleSubmitVerification((data) => submitVerificationMutation.mutate(data))} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Proof Type *</label>
              <select
                {...registerVerification('type')}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                data-testid="select-proof-type"
              >
                <option value="AMAZON_LINK">Amazon Author Page</option>
                <option value="GOODREADS_LINK">Goodreads Author Page</option>
                <option value="PUBLISHER_PAGE">Publisher Page</option>
                <option value="ISBN">ISBN Number</option>
                <option value="OTHER">Other</option>
              </select>
              {verificationErrors.type && (
                <p className="text-sm text-red-600 mt-1">{verificationErrors.type.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Proof Value (URL or ISBN) *</label>
              <Input
                {...registerVerification('value')}
                placeholder="https://... or ISBN number"
                data-testid="input-proof-value"
              />
              {verificationErrors.value && (
                <p className="text-sm text-red-600 mt-1">{verificationErrors.value.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Additional Notes (optional)</label>
              <textarea
                {...registerVerification('notes')}
                placeholder="Any additional context for reviewers..."
                rows={3}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                data-testid="input-proof-notes"
              />
              {verificationErrors.notes && (
                <p className="text-sm text-red-600 mt-1">{verificationErrors.notes.message}</p>
              )}
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                onClick={() => setStep('profile')}
                data-testid="button-back-profile"
              >
                Back to Profile
              </Button>
              <Button
                type="submit"
                disabled={submitVerificationMutation.isPending}
                data-testid="button-submit-verification"
              >
                {submitVerificationMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit for Verification
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
