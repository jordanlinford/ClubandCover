import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ChecklistCode } from '@repo/types';
import { Check, Circle, Trophy } from 'lucide-react';

interface ChecklistCardProps {
  userType: ChecklistCode;
  showTitle?: boolean;
}

const checklistTitles: Record<ChecklistCode, string> = {
  READER_ONBOARDING: 'Reader Onboarding',
  AUTHOR_ONBOARDING: 'Author Onboarding',
  HOST_ONBOARDING: 'Host Onboarding',
};

export function ChecklistCard({ userType, showTitle = true }: ChecklistCardProps) {
  const queryClient = useQueryClient();

  const { data: checklist, isLoading } = useQuery({
    queryKey: ['/api/checklists', userType],
    queryFn: () => api.getUserChecklists(userType),
  });

  const completeStepMutation = useMutation({
    mutationFn: (stepKey: string) => 
      api.completeChecklistStep({ code: userType, stepKey }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checklists', userType] });
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!checklist) {
    return null;
  }

  const isComplete = checklist.progress.percentage === 100;

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
      data-testid={`card-checklist-${userType}`}
    >
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {checklistTitles[userType]}
          </h3>
          {isComplete && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
              <Trophy className="h-4 w-4" />
              <span>Complete!</span>
            </div>
          )}
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Progress
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {checklist.progress.completed} / {checklist.progress.total}
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-300"
            style={{ width: `${checklist.progress.percentage}%` }}
            data-testid="progress-bar"
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3" data-testid="list-checklist-steps">
        {checklist.steps.map((step) => (
          <button
            key={step.key}
            onClick={() => {
              if (!step.completed) {
                completeStepMutation.mutate(step.key);
              }
            }}
            disabled={step.completed || completeStepMutation.isPending}
            className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all ${
              step.completed
                ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30'
                : 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900/50'
            }`}
            data-testid={`step-${step.key}`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {step.completed ? (
                <div className="flex items-center justify-center w-5 h-5 bg-green-500 rounded-full">
                  <Check className="h-3 w-3 text-white" />
                </div>
              ) : (
                <Circle className="h-5 w-5 text-gray-400 dark:text-gray-600" />
              )}
            </div>
            <div className="flex-1 text-left">
              <p
                className={`text-sm font-medium ${
                  step.completed
                    ? 'text-green-700 dark:text-green-400 line-through'
                    : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                {step.title}
              </p>
            </div>
          </button>
        ))}
      </div>

      {isComplete && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Congratulations! You've completed your {checklistTitles[userType].toLowerCase()}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
