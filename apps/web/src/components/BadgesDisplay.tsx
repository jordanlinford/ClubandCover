import { Award } from 'lucide-react';
import { Card } from '@repo/ui';
import type { UserBadge } from '@repo/types';
import { BADGE_ICONS, BADGE_COLORS } from '../lib/badges';

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
