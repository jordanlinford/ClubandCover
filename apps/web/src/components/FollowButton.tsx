import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@repo/ui';
import { UserPlus, UserCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

interface FollowButtonProps {
  authorId: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

export function FollowButton({
  authorId,
  variant = 'outline',
  size = 'default',
  showText = true,
  onFollowChange,
}: FollowButtonProps) {

  const { data: followStatus } = useQuery<{ isFollowing: boolean }>({
    queryKey: ['/api/authors', authorId, 'following', 'status'],
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      return await api.post(`/authors/${authorId}/follow`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/authors', authorId, 'following', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/authors', authorId, 'followers', 'count'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', 'me', 'following'] });
      onFollowChange?.(true);
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      return await api.delete(`/authors/${authorId}/follow`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/authors', authorId, 'following', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/authors', authorId, 'followers', 'count'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', 'me', 'following'] });
      onFollowChange?.(false);
    },
  });

  const isFollowing = followStatus?.isFollowing ?? false;
  const isPending = followMutation.isPending || unfollowMutation.isPending;

  const handleClick = () => {
    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  if (size === 'icon') {
    return (
      <Button
        variant={variant}
        size="icon"
        onClick={handleClick}
        disabled={isPending}
        data-testid={isFollowing ? 'button-unfollow' : 'button-follow'}
      >
        {isFollowing ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isPending}
      data-testid={isFollowing ? 'button-unfollow' : 'button-follow'}
    >
      {isFollowing ? (
        <>
          <UserCheck className="h-4 w-4" />
          {showText && <span>Following</span>}
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          {showText && <span>Follow</span>}
        </>
      )}
    </Button>
  );
}
