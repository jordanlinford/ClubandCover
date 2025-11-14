import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { Card, Button, PageHeader } from '@repo/ui';
import { BookOpen, Users, FileText, CheckCircle, ExternalLink, Globe } from 'lucide-react';
import { api } from '../lib/api';
import { queryClient } from '../lib/queryClient';
import { useToast } from '../hooks/use-toast';
import { SiFacebook, SiInstagram, SiGoodreads, SiAmazon } from 'react-icons/si';
import { Twitter } from 'lucide-react';

interface PublicAuthorProfileData {
  id: string;
  name: string;
  avatarUrl: string | null;
  memberSince: string;
  penName: string | null;
  bio: string | null;
  genres: string[];
  website: string | null;
  socialLinks: Record<string, string> | null;
  isVerified: boolean;
  stats: {
    followers: number;
    publishedPitches: number;
    books: number;
    completedSwaps: number;
  };
  pitches: Array<{
    id: string;
    title: string;
    synopsis: string | null;
    imageUrl: string | null;
    genres: string[];
    publishedAt: string;
    nominationCount: number;
  }>;
  isFollowing: boolean;
}

export function PublicAuthorProfilePage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery<PublicAuthorProfileData>({
    queryKey: [`/authors/${userId}`],
    enabled: !!userId,
  });

  const followMutation = useMutation({
    mutationFn: () => api.followAuthor(userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/authors/${userId}`] });
      toast({
        title: 'Following author',
        description: `You are now following ${profile?.penName || profile?.name}`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to follow',
        description: error.message || 'Failed to follow author',
      });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => api.unfollowAuthor(userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/authors/${userId}`] });
      toast({
        title: 'Unfollowed author',
        description: `You are no longer following ${profile?.penName || profile?.name}`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to unfollow',
        description: error.message || 'Failed to unfollow author',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center text-muted-foreground">Loading author profile...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-5xl mx-auto">
          <PageHeader title="Author Not Found" description="The author profile you're looking for doesn't exist." />
        </div>
      </div>
    );
  }

  const displayName = profile.penName || profile.name;
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase();
  const memberSince = new Date(profile.memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const socialIcons: Record<string, any> = {
    twitter: Twitter,
    facebook: SiFacebook,
    instagram: SiInstagram,
    goodreads: SiGoodreads,
    amazon: SiAmazon,
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <Card className="p-6">
          <div className="flex items-start gap-6 flex-wrap">
            <div 
              className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-semibold text-primary flex-shrink-0"
              data-testid="avatar-author"
            >
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={displayName} className="h-full w-full rounded-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h1 className="text-3xl font-bold" data-testid="text-author-name">{displayName}</h1>
                {profile.isVerified && (
                  <CheckCircle className="h-6 w-6 text-primary" data-testid="icon-verified" />
                )}
              </div>
              <div className="text-sm text-muted-foreground mb-4">
                Author since {memberSince}
              </div>
              {profile.bio && (
                <p className="text-muted-foreground whitespace-pre-wrap mb-4" data-testid="text-author-bio">
                  {profile.bio}
                </p>
              )}
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => profile.isFollowing ? unfollowMutation.mutate() : followMutation.mutate()}
                  disabled={followMutation.isPending || unfollowMutation.isPending}
                  variant={profile.isFollowing ? 'outline' : 'default'}
                  data-testid={profile.isFollowing ? 'button-unfollow' : 'button-follow'}
                >
                  <Users className="h-4 w-4 mr-2" />
                  {profile.isFollowing ? 'Following' : 'Follow'}
                </Button>
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" data-testid="button-website">
                      <Globe className="h-4 w-4 mr-2" />
                      Website
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>

          {profile.socialLinks && Object.keys(profile.socialLinks).length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex gap-4 flex-wrap" data-testid="list-social-links">
                {Object.entries(profile.socialLinks).map(([platform, url]) => {
                  const Icon = socialIcons[platform.toLowerCase()];
                  return Icon ? (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover-elevate p-2 rounded-md"
                      data-testid={`link-social-${platform.toLowerCase()}`}
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Followers</span>
            </div>
            <div className="text-2xl font-bold" data-testid="text-follower-count">{profile.stats.followers}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Pitches</span>
            </div>
            <div className="text-2xl font-bold" data-testid="text-pitch-count">{profile.stats.publishedPitches}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Books</span>
            </div>
            <div className="text-2xl font-bold" data-testid="text-book-count">{profile.stats.books}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Swaps</span>
            </div>
            <div className="text-2xl font-bold" data-testid="text-swap-count">{profile.stats.completedSwaps}</div>
          </Card>
        </div>

        {profile.genres.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Genres</h2>
            </div>
            <div className="flex flex-wrap gap-2" data-testid="list-genres">
              {profile.genres.map((genre) => (
                <span 
                  key={genre} 
                  className="px-3 py-1 text-sm rounded-md bg-secondary text-secondary-foreground"
                  data-testid={`badge-genre-${genre.toLowerCase()}`}
                >
                  {genre}
                </span>
              ))}
            </div>
          </Card>
        )}

        {profile.pitches.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Published Pitches</h2>
              <span className="px-2 py-0.5 text-xs rounded-md bg-secondary text-secondary-foreground">
                {profile.pitches.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="list-pitches">
              {profile.pitches.map((pitch) => (
                <Link key={pitch.id} href={`/pitches/${pitch.id}`}>
                  <div className="hover-elevate rounded-md border p-4 cursor-pointer h-full" data-testid={`card-pitch-${pitch.id}`}>
                    {pitch.imageUrl && (
                      <img 
                        src={pitch.imageUrl} 
                        alt={pitch.title}
                        className="w-full h-40 object-cover rounded-md mb-3"
                      />
                    )}
                    <h3 className="font-semibold mb-2 line-clamp-2" data-testid={`text-pitch-title-${pitch.id}`}>
                      {pitch.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                      {pitch.synopsis}
                    </p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {pitch.genres.slice(0, 3).map((genre) => (
                        <span 
                          key={genre}
                          className="px-2 py-0.5 text-xs rounded-md bg-secondary text-secondary-foreground"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pitch.nominationCount} {pitch.nominationCount === 1 ? 'nomination' : 'nominations'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        )}

        {profile.pitches.length === 0 && (
          <Card className="p-6">
            <div className="text-center text-muted-foreground py-8">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No published pitches yet</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
