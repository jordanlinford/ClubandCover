import { Card } from '@repo/ui';
import type { Pitch } from '@repo/types';
import { Link } from 'wouter';
import { Zap, Target, BookOpen, Gift } from 'lucide-react';

interface PitchCardProps {
  pitch: Pitch;
}

export function PitchCard({ pitch }: PitchCardProps) {
  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  const isBoosted = (pitch as any).isBoosted && (pitch as any).boostEndsAt && new Date((pitch as any).boostEndsAt) > new Date();
  const isSponsored = (pitch as any).isSponsored;

  return (
    <Link href={`/pitches/${pitch.id}`}>
      <Card
        className="p-6 hover-elevate cursor-pointer"
        data-testid={`card-pitch-${pitch.id}`}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {isBoosted && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20" data-testid={`badge-boosted-${pitch.id}`}>
                  <Zap className="h-3 w-3" />
                  Boosted
                </span>
              )}
              {isSponsored && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800" data-testid={`badge-sponsored-${pitch.id}`}>
                  <Target className="h-3 w-3" />
                  Sponsored
                </span>
              )}
            </div>
            <h3
              className="font-semibold text-lg"
              data-testid={`text-pitch-title-${pitch.id}`}
            >
              {pitch.title}
            </h3>
          </div>
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

        {/* Available Formats and Free Offer */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {pitch.availableFormats && pitch.availableFormats.length > 0 && (
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {pitch.availableFormats.map(f => f.replace('_', ' ')).join(', ')}
              </span>
            </div>
          )}
          {pitch.offerFreeIfChosen && (
            <span 
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
              data-testid={`badge-free-offer-${pitch.id}`}
            >
              <Gift className="h-3 w-3" />
              Free if chosen
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span data-testid={`text-created-${pitch.id}`}>
            {new Date(pitch.createdAt).toLocaleDateString()}
          </span>
        </div>
      </Card>
    </Link>
  );
}
