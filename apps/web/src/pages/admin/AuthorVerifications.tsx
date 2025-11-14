import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

export default function AuthorVerifications() {
  const { toast } = useToast();
  const [selectedProfile, setSelectedProfile] = useState<AuthorProfile | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: pendingVerifications, isLoading } = useQuery({
    queryKey: ['/api/admin/author-verifications/pending'],
  });

  const approveMutation = useMutation({
    mutationFn: (profileId: string) =>
      apiRequest('/api/admin/author-verifications/approve', {
        method: 'POST',
        body: JSON.stringify({ profileId }),
      }),
    onSuccess: () => {
      toast({
        title: 'Verification approved',
        description: 'Author has been verified successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/author-verifications/pending'] });
      setSelectedProfile(null);
      setActionType(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve verification',
        variant: 'destructive',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ profileId, reason }: { profileId: string; reason?: string }) =>
      apiRequest('/api/admin/author-verifications/reject', {
        method: 'POST',
        body: JSON.stringify({ profileId, reason }),
      }),
    onSuccess: () => {
      toast({
        title: 'Verification rejected',
        description: 'Author verification has been rejected.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/author-verifications/pending'] });
      setSelectedProfile(null);
      setActionType(null);
      setRejectionReason('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject verification',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" data-testid="loader-verifications" />
      </div>
    );
  }

  const profiles = pendingVerifications?.data || [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Author Verifications</h1>
        <p className="text-muted-foreground">
          Review and approve pending author verification requests.
        </p>
      </div>

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground" data-testid="text-no-pending">
              No pending verifications
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {profiles.map((profile: AuthorProfile) => (
            <Card key={profile.id} data-testid={`card-profile-${profile.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>
                      {profile.penName || profile.user.name}
                      <Badge variant="secondary" className="ml-2">
                        Pending Review
                      </Badge>
                    </CardTitle>
                    <CardDescription>{profile.user.email}</CardDescription>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Submitted {new Date(profile.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Bio</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-bio">
                    {profile.bio}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Genres</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.genres.map((genre) => (
                      <Badge key={genre} variant="outline" data-testid={`badge-genre-${genre}`}>
                        {genre}
                      </Badge>
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
                      className="text-sm text-primary hover:underline flex items-center gap-1"
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
                        className="border rounded-lg p-3"
                        data-testid={`proof-${proof.type}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="secondary">{proof.type.replace(/_/g, ' ')}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(proof.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <a
                          href={proof.value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1 break-all"
                          data-testid="link-proof-value"
                        >
                          {proof.value}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                        {proof.notes && (
                          <p className="text-sm text-muted-foreground mt-2">{proof.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
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
                    variant="destructive"
                    onClick={() => {
                      setSelectedProfile(profile);
                      setActionType('reject');
                    }}
                    data-testid="button-reject"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation Dialogs */}
      {selectedProfile && actionType === 'approve' && (
        <Dialog open onOpenChange={() => {
          setSelectedProfile(null);
          setActionType(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Author Verification</DialogTitle>
              <DialogDescription>
                Are you sure you want to verify {selectedProfile.penName || selectedProfile.user.name} as an author?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
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
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {selectedProfile && actionType === 'reject' && (
        <Dialog open onOpenChange={() => {
          setSelectedProfile(null);
          setActionType(null);
          setRejectionReason('');
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Author Verification</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this verification request.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="rejection-reason">Rejection Reason (optional)</Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="E.g., Insufficient proof of published works..."
                  rows={4}
                  data-testid="input-rejection-reason"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
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
                variant="destructive"
                onClick={() =>
                  rejectMutation.mutate({
                    profileId: selectedProfile.id,
                    reason: rejectionReason,
                  })
                }
                disabled={rejectMutation.isPending}
                data-testid="button-confirm-reject"
              >
                {rejectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
