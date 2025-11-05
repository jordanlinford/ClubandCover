import { Card } from '@repo/ui';
import type { Pitch } from '@repo/types';
import { Link } from 'wouter';

interface PitchCardProps {
  pitch: Pitch;
}

export function PitchCard({ pitch }: PitchCardProps) {
  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <Link href={`/pitches/${pitch.id}`}>
      <Card
        className="p-6 hover-elevate cursor-pointer"
        data-testid={`card-pitch-${pitch.id}`}
      >
        <div className="flex justify-between items-start mb-3">
          <h3
            className="font-semibold text-lg flex-1"
            data-testid={`text-pitch-title-${pitch.id}`}
          >
            {pitch.title}
          </h3>
          <span
            className={`text-xs px-2 py-1 rounded-md ${statusColors[pitch.status]}`}
            data-testid={`badge-status-${pitch.id}`}
          >
            {pitch.status}
          </span>
        </div>
        
        <p
          className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4"
          data-testid={`text-blurb-${pitch.id}`}
        >
          {pitch.blurb}
        </p>

        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span data-testid={`text-created-${pitch.id}`}>
            {new Date(pitch.createdAt).toLocaleDateString()}
          </span>
        </div>
      </Card>
    </Link>
  );
}
