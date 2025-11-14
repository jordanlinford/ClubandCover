import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card } from '@repo/ui';
import { Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

interface AuthorProfile {
  id: string;
  userId: string;
  penName: string | null;
  bio: string;
  genres: string[];
  website: string | null;
  verificationStatus: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    createdAt: string;
  };
  verificationProofs: Array<{
    id: string;
    type: string;
    value: string;
    notes: string | null;
    createdAt: string;
  }>;
}

export default function AdminAuthorVerifications() {
  const queryClient = useQueryClient();
  const [selectedProfile, setSelectedProfile] = useState<AuthorProfile | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: pendingResponse, isLoading } = useQuery<{ success: boolean; data: AuthorProfile[] }>({
    queryKey: ['/api/admin/author-verifications/pending'],
  });

  const approveMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const response = await fetch('/api/admin/author-verifications/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve verification');
      }
      return response.json();
    },
    onSuccess: () => {
      setSuccess('Author verification approved successfully');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/author-verifications/pending'] });
      setSelectedProfile(null);
      setActionType(null);
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess('');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ profileId, reason }: { profileId: string; reason?: string }) => {
      const response = await fetch('/api/admin/author-verifications/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, reason }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject verification');
      }
      return response.json();
    },
    onSuccess: () => {
      setSuccess('Author verification rejected');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/author-verifications/pending'] });
      setSelectedProfile(null);
      setActionType(null);
      setRejectionReason('');
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess('');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" data-testid="loader-verifications" />
      </div>
    );
  }

  const profiles = pendingResponse?.data || [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Author Verifications</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Review and approve pending author verification requests.
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

      {profiles.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400" data-testid="text-no-pending">
            No pending verifications
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {profiles.map((profile: AuthorProfile) => (
            <Card key={profile.id} className="p-6" data-testid={`card-profile-${profile.id}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    {profile.penName || profile.user.name}
                    <span className="ml-2 px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full text-sm font-medium">
                      Pending Review
                    </span>
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">{profile.user.email}</p>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Submitted {new Date(profile.updatedAt).toLocaleDateString()}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Bio</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap" data-testid="text-bio">
                    {profile.bio}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Genres</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.genres.map((genre) => (
                      <span
                        key={genre}
                        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-sm"
                        data-testid={`badge-genre-${genre}`}
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>

                {profile.website && (
                  <div>
                    <h4 className="font-medium mb-2">Website</h4>
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      data-testid="link-website"
                    >
                      {profile.website}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                <div>
                  <h4 className="font-medium mb-2">Verification Proofs</h4>
                  <div className="space-y-2">
                    {profile.verificationProofs.map((proof) => (
                      <div
                        key={proof.id}
                        className="border dark:border-gray-700 rounded-lg p-3"
                        data-testid={`proof-${proof.type}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-sm">
                            {proof.type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {new Date(proof.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <a
                          href={proof.value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 break-all"
                          data-testid="link-proof-value"
                        >
                          {proof.value}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                        {proof.notes && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{proof.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
                  <Button
                    onClick={() => {
                      setSelectedProfile(profile);
                      setActionType('approve');
                    }}
                    data-testid="button-approve"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedProfile(profile);
                      setActionType('reject');
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    data-testid="button-reject"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation Dialogs */}
      {selectedProfile && actionType === 'approve' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-2">Approve Author Verification</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to verify {selectedProfile.penName || selectedProfile.user.name} as an author?
            </p>
            <div className="flex gap-4">
              <Button
                onClick={() => {
                  setSelectedProfile(null);
                  setActionType(null);
                }}
                data-testid="button-cancel-approve"
              >
                Cancel
              </Button>
              <Button
                onClick={() => approveMutation.mutate(selectedProfile.id)}
                disabled={approveMutation.isPending}
                data-testid="button-confirm-approve"
              >
                {approveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Approve
              </Button>
            </div>
          </Card>
        </div>
      )}

      {selectedProfile && actionType === 'reject' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-2">Reject Author Verification</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please provide a reason for rejecting this verification request.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Rejection Reason (optional)</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="E.g., Insufficient proof of published works..."
                rows={4}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                data-testid="input-rejection-reason"
              />
            </div>
            <div className="flex gap-4">
              <Button
                onClick={() => {
                  setSelectedProfile(null);
                  setActionType(null);
                  setRejectionReason('');
                }}
                data-testid="button-cancel-reject"
              >
                Cancel
              </Button>
              <Button
                onClick={() =>
                  rejectMutation.mutate({
                    profileId: selectedProfile.id,
                    reason: rejectionReason,
                  })
                }
                disabled={rejectMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
                data-testid="button-confirm-reject"
              >
                {rejectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Reject
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
