import { Star } from 'lucide-react';

interface PointsBadgeProps {
  points: number;
  reputation?: number;
  showLabel?: boolean;
}

export function PointsBadge({ points, reputation, showLabel = false }: PointsBadgeProps) {
  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md text-sm"
      data-testid="badge-points"
      title={reputation !== undefined ? `Points: ${points}, Reputation: ${reputation}` : `Points: ${points}`}
    >
      <Star className="h-3 w-3" />
      <span data-testid="text-points-value">{points}</span>
      {showLabel && <span className="ml-1">points</span>}
    </div>
  );
}
