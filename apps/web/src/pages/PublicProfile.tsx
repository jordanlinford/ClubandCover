import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { Card, Button } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import { Calendar, Users, Award, BookOpen, Feather } from 'lucide-react';
import { BADGE_ICONS, BADGE_COLORS } from '../lib/badges';
import { useLocation } from 'wouter';

interface PublicProfileData {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  isAuthor?: boolean;
  clubs?: Array<{
    id: string;
    name: string;
    description: string | null;
    coverImageUrl: string | null;
    memberCount: number;
    role: string;
    joinedAt: string;
  }>;
  badges?: Array<{
    code: string;
    awardedAt: string;
  }>;
  genres?: string[];
}

export function PublicProfilePage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  const [, setLocation] = useLocation();

  const { data: response, isLoading, error } = useQuery<{ success: boolean; data: PublicProfileData }>({
    queryKey: [`/api/users/${userId}/profile`],
    enabled: !!userId,
  });

  const profile = response?.data;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-muted-foreground">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <PageHeader title="Profile Not Found" description="The profile you're looking for doesn't exist or has been removed." />
        </div>
      </div>
    );
  }

  const initials = profile.name.split(' ').map(n => n[0]).join('').toUpperCase();
  const joinDate = new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="p-6">
          <div className="flex items-start gap-6">
            <div 
              className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-semibold text-primary"
              data-testid="avatar-user"
            >
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full rounded-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold mb-2" data-testid="text-user-name">{profile.name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Calendar className="h-4 w-4" />
                <span data-testid="text-joined-date">Joined {joinDate}</span>
              </div>
              {profile.bio && (
                <p className="text-muted-foreground mt-4 whitespace-pre-wrap" data-testid="text-user-bio">
                  {profile.bio}
                </p>
              )}
              {profile.isAuthor && (
                <Link href={`/authors/${profile.id}`}>
                  <div className="mt-4">
                    <Button variant="outline" data-testid="link-author-profile">
                      <Feather className="h-4 w-4 mr-2" />
                      View Author Profile
                    </Button>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </Card>

        {profile.genres && profile.genres.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Favorite Genres</h2>
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

        {profile.badges && profile.badges.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Badges</h2>
              <span className="px-2 py-0.5 text-xs rounded-md bg-secondary text-secondary-foreground">
                {profile.badges.length}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="list-badges">
              {profile.badges.map((badge) => {
                const Icon = BADGE_ICONS[badge.code] || Award;
                const colorClass = BADGE_COLORS[badge.code] || 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30';
                const earnedDate = new Date(badge.awardedAt).toLocaleDateString();

                return (
                  <div
                    key={badge.code}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg border bg-card hover-elevate"
                    data-testid={`badge-earned-${badge.code.toLowerCase()}`}
                  >
                    <div className={`p-3 rounded-lg ${colorClass}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="text-xs text-center text-muted-foreground">{earnedDate}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {profile.clubs && profile.clubs.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Clubs</h2>
              <span className="px-2 py-0.5 text-xs rounded-md bg-secondary text-secondary-foreground">
                {profile.clubs.length}
              </span>
            </div>
            <div className="grid gap-4" data-testid="list-clubs">
              {profile.clubs.map((club) => (
                <Card
                  key={club.id}
                  className="p-4 hover-elevate cursor-pointer"
                  onClick={() => setLocation(`/clubs/${club.id}`)}
                  data-testid={`club-card-${club.id}`}
                >
                  <div className="flex items-start gap-4">
                    {club.coverImageUrl && (
                      <img
                        src={club.coverImageUrl}
                        alt={club.name}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg" data-testid={`text-club-name-${club.id}`}>{club.name}</h3>
                        <span className="px-2 py-0.5 text-xs rounded border">
                          {club.role.toLowerCase()}
                        </span>
                      </div>
                      {club.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {club.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {club.memberCount} members
                        </span>
                        <span>Joined {new Date(club.joinedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        )}

        {!profile.badges && !profile.clubs && !profile.genres && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">This user has made their profile private.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
