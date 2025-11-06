import { Award, BookOpen, Users, Feather, Trophy, Sparkles, Target, TrendingUp, Repeat } from 'lucide-react';
import { Card } from '@repo/ui';
import type { UserBadge } from '@repo/types';

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
  SWAP_MASTER: Repeat,
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
  SWAP_MASTER: 'text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/30',
};

interface BadgesDisplayProps {
  badges: UserBadge[];
}

export function BadgesDisplay({ badges }: BadgesDisplayProps) {
  if (badges.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No badges earned yet. Keep participating to earn your first badge!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {badges.map((userBadge) => {
        const badge = userBadge.badge;
        if (!badge) return null;

        const Icon = BADGE_ICONS[badge.id] || Award;
        const colorClass = BADGE_COLORS[badge.id] || 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30';

        return (
          <Card
            key={userBadge.id}
            className="p-4 flex items-start gap-3"
            data-testid={`badge-${badge.id.toLowerCase()}`}
          >
            <div className={`p-2 rounded-lg ${colorClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm" data-testid={`text-badge-name-${badge.id.toLowerCase()}`}>
                {badge.name}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {badge.description}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Earned {new Date(userBadge.earnedAt).toLocaleDateString()}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
