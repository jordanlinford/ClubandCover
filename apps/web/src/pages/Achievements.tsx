import { useQuery } from '@tanstack/react-query';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import { useAuth } from '../contexts/AuthContext';
import { 
  Award, 
  Trophy, 
  Target, 
  BookOpen, 
  Users, 
  Sparkles, 
  TrendingUp, 
  Feather, 
  CheckCircle, 
  Repeat,
  Star,
  Lock,
  Clock
} from 'lucide-react';
import { useState } from 'react';

const BADGE_ICONS: Record<string, typeof Award> = {
  FIRST_VOTE: Target,
  BOOKWORM: BookOpen,
  SOCIABLE: Users,
  LOYAL_MEMBER: Sparkles,
  HOST_STARTER: Users,
  COMMUNITY_ACTIVE: TrendingUp,
  DECISIVE: Trophy,
  AUTHOR_LAUNCH: Feather,
  FAN_FAVORITE: Trophy,
  SWAP_VERIFIED: CheckCircle,
  SWAP_MASTER: Repeat,
  BOOK_REVIEWER: Star,
  CRITIC: Award,
};

const BADGE_COLORS: Record<string, string> = {
  FIRST_VOTE: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
  BOOKWORM: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
  SOCIABLE: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30',
  LOYAL_MEMBER: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
  HOST_STARTER: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30',
  COMMUNITY_ACTIVE: 'text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/30',
  DECISIVE: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30',
  AUTHOR_LAUNCH: 'text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/30',
  FAN_FAVORITE: 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30',
  SWAP_VERIFIED: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30',
  SWAP_MASTER: 'text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/30',
  BOOK_REVIEWER: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30',
  CRITIC: 'text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30',
};

type Category = 'ALL' | 'READER' | 'AUTHOR' | 'HOST';

interface BadgeProgress {
  code: string;
  id: string;
  name: string;
  description: string;
  category: 'READER' | 'AUTHOR' | 'HOST';
  icon: string;
  isEarned: boolean;
  earnedAt: string | null;
  progress: {
    complete: boolean;
    current?: number;
    required?: number;
  };
}

interface BadgeStats {
  total: number;
  earned: number;
  progress: number;
  byCategory: {
    READER: { total: number; earned: number };
    AUTHOR: { total: number; earned: number };
    HOST: { total: number; earned: number };
  };
}

export function AchievementsPage() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<Category>('ALL');

  const { data: progressResponse, isLoading } = useQuery<{
    success: boolean;
    data: {
      badges: BadgeProgress[];
      stats: BadgeStats;
    };
  }>({
    queryKey: ['/api/badges/progress'],
    enabled: !!user?.id,
  });

  const badges = progressResponse?.data?.badges || [];
  const stats = progressResponse?.data?.stats;

  const filteredBadges = selectedCategory === 'ALL' 
    ? badges 
    : badges.filter((b) => b.category === selectedCategory);

  const earnedBadges = filteredBadges.filter((b) => b.isEarned);
  const unearnedBadges = filteredBadges.filter((b) => !b.isEarned);

  const renderProgressBar = (badge: BadgeProgress) => {
    if (!badge.progress.current || !badge.progress.required) return null;

    const percentage = Math.min(
      (badge.progress.current / badge.progress.required) * 100,
      100
    );

    return (
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Progress</span>
          <span>
            {badge.progress.current} / {badge.progress.required}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  const renderBadgeCard = (badge: BadgeProgress) => {
    const Icon = BADGE_ICONS[badge.code] || Award;
    const colorClass = BADGE_COLORS[badge.code] || 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30';

    return (
      <Card
        key={badge.code}
        className={`p-4 ${!badge.isEarned ? 'opacity-60' : ''}`}
        data-testid={`badge-card-${badge.code.toLowerCase()}`}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${colorClass} relative`}>
            <Icon className="h-5 w-5" />
            {!badge.isEarned && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/40 rounded-lg">
                <Lock className="h-3 w-3" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 
              className="font-semibold text-sm flex items-center gap-2" 
              data-testid={`text-badge-name-${badge.code.toLowerCase()}`}
            >
              {badge.name}
              {badge.isEarned && (
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              )}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {badge.description}
            </p>
            {badge.isEarned && badge.earnedAt && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Earned {new Date(badge.earnedAt).toLocaleDateString()}
              </p>
            )}
            {!badge.isEarned && renderProgressBar(badge)}
          </div>
        </div>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto p-6">
          <PageHeader title="Achievements" description="Track your progress and earn badges" />
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-12 bg-muted rounded" />
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6">
        <PageHeader
          title="Achievements"
          description="Track your progress and earn badges by participating in the community"
        />

        {stats && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Earned</p>
                  <p className="text-2xl font-bold" data-testid="text-total-earned">
                    {stats.earned} / {stats.total}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reader</p>
                  <p className="text-2xl font-bold" data-testid="text-reader-earned">
                    {stats.byCategory.READER.earned} / {stats.byCategory.READER.total}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Feather className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Author</p>
                  <p className="text-2xl font-bold" data-testid="text-author-earned">
                    {stats.byCategory.AUTHOR.earned} / {stats.byCategory.AUTHOR.total}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Host</p>
                  <p className="text-2xl font-bold" data-testid="text-host-earned">
                    {stats.byCategory.HOST.earned} / {stats.byCategory.HOST.total}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="mt-6 flex items-center gap-2 flex-wrap">
          <Button
            variant={selectedCategory === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('ALL')}
            data-testid="button-filter-all"
          >
            All Badges
          </Button>
          <Button
            variant={selectedCategory === 'READER' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('READER')}
            data-testid="button-filter-reader"
          >
            <BookOpen className="h-4 w-4 mr-1" />
            Reader
          </Button>
          <Button
            variant={selectedCategory === 'AUTHOR' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('AUTHOR')}
            data-testid="button-filter-author"
          >
            <Feather className="h-4 w-4 mr-1" />
            Author
          </Button>
          <Button
            variant={selectedCategory === 'HOST' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('HOST')}
            data-testid="button-filter-host"
          >
            <Users className="h-4 w-4 mr-1" />
            Host
          </Button>
        </div>

        {earnedBadges.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              Earned Badges ({earnedBadges.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {earnedBadges.map(renderBadgeCard)}
            </div>
          </div>
        )}

        {unearnedBadges.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              In Progress ({unearnedBadges.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unearnedBadges.map(renderBadgeCard)}
            </div>
          </div>
        )}

        {badges.length === 0 && !isLoading && (
          <Card className="p-12 text-center mt-6">
            <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No badges available</h3>
            <p className="text-muted-foreground">
              Start participating in the community to earn badges!
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
