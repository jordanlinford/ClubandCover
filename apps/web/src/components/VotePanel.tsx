import { useState } from 'react';
import { Button } from '@repo/ui';
import type { PollOption, Vote } from '@repo/types';

interface VotePanelProps {
  options: Array<{ option: PollOption; count: number }>;
  userVote?: Vote;
  onVote: (optionId: string) => void;
  isPending: boolean;
  pollStatus: 'DRAFT' | 'OPEN' | 'CLOSED';
}

export function VotePanel({ options, userVote, onVote, isPending, pollStatus }: VotePanelProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string>(userVote?.pollOptionId || '');

  const handleVote = () => {
    if (selectedOptionId) {
      onVote(selectedOptionId);
    }
  };

  const canVote = pollStatus === 'OPEN' && !userVote;
  const showResults = pollStatus === 'CLOSED' || !!userVote;

  return (
    <div className="space-y-4">
      {options.map(({ option, count }) => {
        const isSelected = selectedOptionId === option.id;
        const isUserVote = userVote?.pollOptionId === option.id;
        const percentage = showResults && options.length > 0
          ? Math.round((count / options.reduce((sum, o) => sum + o.count, 0)) * 100) || 0
          : 0;

        return (
          <div
            key={option.id}
            className={`relative p-4 border rounded-md ${
              isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700'
            } ${canVote ? 'cursor-pointer hover-elevate' : ''}`}
            onClick={() => canVote && setSelectedOptionId(option.id)}
            data-testid={`option-${option.id}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {canVote && (
                    <input
                      type="radio"
                      name="vote"
                      value={option.id}
                      checked={isSelected}
                      onChange={() => setSelectedOptionId(option.id)}
                      className="mt-0.5"
                      data-testid={`radio-${option.id}`}
                    />
                  )}
                  <p className="font-medium" data-testid={`text-option-${option.id}`}>
                    {option.text}
                  </p>
                </div>
                {isUserVote && (
                  <span className="inline-block mt-1 text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-md">
                    Your vote
                  </span>
                )}
              </div>
              {showResults && (
                <div className="text-right">
                  <div className="font-semibold" data-testid={`text-count-${option.id}`}>
                    {count} {count === 1 ? 'vote' : 'votes'}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {percentage}%
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {canVote && (
        <Button
          onClick={handleVote}
          disabled={!selectedOptionId || isPending}
          data-testid="button-submit-vote"
        >
          {isPending ? 'Submitting...' : 'Submit Vote'}
        </Button>
      )}

      {pollStatus === 'DRAFT' && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This poll has not opened yet.
        </p>
      )}

      {pollStatus === 'CLOSED' && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This poll is closed. Results are shown above.
        </p>
      )}
    </div>
  );
}
