import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { Loader2, Users, Check, Clock, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function ClubInvitePage() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isJoining, setIsJoining] = useState(false);

  // Fetch invite details
  const { data: inviteData, isLoading, error } = useQuery({
    queryKey: ['/api/clubs/invite', code],
    queryFn: async () => {
      const response = await api.get<{
        success: boolean;
        data?: {
          id: string;
          code: string;
          expiresAt: string | null;
          maxUses: number | null;
          usesCount: number;
          club: {
            id: string;
            name: string;
            description: string | null;
            coverImageUrl: string | null;
            preferredGenres: string[];
            joinRules: string;
            minPointsToJoin: number;
            _count: {
              memberships: number;
            };
          };
          creator: {
            id: string;
            name: string;
            avatarUrl: string | null;
          };
        };
        error?: string;
      }>(`/clubs/invite/${code}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to load invite');
      }

      return response.data;
    },
    enabled: !!code,
  });

  // Join club mutation
  const joinMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<{
        success: boolean;
        data?: any;
        error?: string;
      }>(`/clubs/invite/${code}/join`, {});

      if (!response.success) {
        throw new Error(response.error || 'Failed to join club');
      }

      return response.data;
    },
    onSuccess: (membership) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/clubs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/memberships'] });

      toast({
        title: 'Success!',
        description:
          membership.status === 'ACTIVE'
            ? 'You have joined the club!'
            : 'Your membership request is pending approval',
      });

      // Redirect to club page
      if (inviteData) {
        setLocation(`/clubs/${inviteData.club.id}`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to join club',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleJoin = () => {
    if (!user) {
      setLocation('/auth/login');
      return;
    }
    setIsJoining(true);
    joinMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="page-club-invite">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" data-testid="page-club-invite-error">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Invalid Invite</h1>
          <p className="text-muted-foreground mb-6">
            {error instanceof Error ? error.message : 'This invite link is invalid or has expired'}
          </p>
          <Button onClick={() => setLocation('/discover')} data-testid="button-browse-clubs">
            Browse Clubs
          </Button>
        </Card>
      </div>
    );
  }

  const { club, creator, expiresAt, maxUses, usesCount } = inviteData;
  const isExpiringSoon = expiresAt && new Date(expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;
  const usesRemaining = maxUses ? maxUses - usesCount : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" data-testid="page-club-invite">
      <Card className="max-w-2xl w-full">
        {/* Club Cover */}
        {club.coverImageUrl && (
          <div className="w-full h-48 overflow-hidden rounded-t-xl">
            <img
              src={club.coverImageUrl}
              alt={club.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-8">
          {/* Invitation Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              <span>You're invited to join</span>
            </div>
            <h1 className="text-3xl font-semibold mb-2" data-testid="text-club-name">
              {club.name}
            </h1>
            {club.description && (
              <p className="text-muted-foreground" data-testid="text-club-description">
                {club.description}
              </p>
            )}
          </div>

          {/* Club Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-semibold" data-testid="text-member-count">
                {club._count.memberships}
              </div>
              <div className="text-sm text-muted-foreground">Members</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-semibold capitalize">
                {club.joinRules.toLowerCase().replace('_', ' ')}
              </div>
              <div className="text-sm text-muted-foreground">Access Level</div>
            </div>
          </div>

          {/* Genres */}
          {club.preferredGenres.length > 0 && (
            <div className="mb-6">
              <div className="text-sm font-medium mb-2">Preferred Genres</div>
              <div className="flex flex-wrap gap-2">
                {club.preferredGenres.map((genre) => (
                  <span
                    key={genre}
                    className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Invite Info */}
          <div className="mb-6 p-4 rounded-lg bg-muted/50">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-background p-2">
                {creator.avatarUrl ? (
                  <img
                    src={creator.avatarUrl}
                    alt={creator.name}
                    className="h-10 w-10 rounded-full"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {creator.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">Invited by</div>
                <div className="font-medium" data-testid="text-inviter-name">
                  {creator.name}
                </div>
              </div>
            </div>

            {/* Expiry/Usage Info */}
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {expiresAt && (
                <div className={`flex items-center gap-1.5 ${isExpiringSoon ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  <Clock className="h-4 w-4" />
                  <span>
                    Expires {new Date(expiresAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              {usesRemaining !== null && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{usesRemaining} uses remaining</span>
                </div>
              )}
            </div>
          </div>

          {/* Join Button */}
          <div className="flex gap-3">
            <Button
              onClick={handleJoin}
              disabled={joinMutation.isPending || isJoining}
              className="flex-1"
              data-testid="button-join-club"
            >
              {joinMutation.isPending || isJoining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Accept Invitation
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation('/discover')}
              data-testid="button-cancel"
            >
              Maybe Later
            </Button>
          </div>

          {/* Additional Info */}
          {club.joinRules === 'APPROVAL' && (
            <p className="mt-4 text-sm text-muted-foreground text-center">
              Your request will be reviewed by club administrators
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
