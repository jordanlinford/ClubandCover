import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@repo/ui';
import { Card } from '@repo/ui';
import { Star, CheckCircle2, Package, MessageCircle, X } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface SwapRatingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  swapId: string;
  partnerName: string;
  onSuccess?: () => void;
}

export function SwapRatingDialog({ isOpen, onClose, swapId, partnerName, onSuccess: onSuccessCallback }: SwapRatingDialogProps) {
  const [overallRating, setOverallRating] = useState(0);
  const [bookCondition, setBookCondition] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [onTime, setOnTime] = useState(true);
  const [comment, setComment] = useState('');
  const [hoveredStar, setHoveredStar] = useState<{ field: string; value: number } | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Reset form state when swapId changes (different swap selected)
  useEffect(() => {
    setOverallRating(0);
    setBookCondition(0);
    setCommunication(0);
    setOnTime(true);
    setComment('');
  }, [swapId]);

  const submitRatingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/swaps/${swapId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overallRating,
          bookCondition,
          communication,
          onTime,
          comment: comment.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit rating');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/swaps'] });
      queryClient.invalidateQueries({ queryKey: ['/api/swaps/ratings/my-status'] });
      toast({
        title: 'Rating submitted',
        description: 'Thank you for rating your swap partner!',
      });
      // Reset form on successful submission
      setOverallRating(0);
      setBookCondition(0);
      setCommunication(0);
      setOnTime(true);
      setComment('');
      // Call parent's onSuccess to clear selection and close dialog
      onSuccessCallback?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const renderStarRating = (
    field: string,
    value: number,
    setter: (v: number) => void,
    label: string,
    icon: React.ReactNode
  ) => {
    const displayValue = hoveredStar?.field === field ? hoveredStar.value : value;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {icon}
          <label className="block text-sm font-medium">{label}</label>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setter(star)}
              onMouseEnter={() => setHoveredStar({ field, value: star })}
              onMouseLeave={() => setHoveredStar(null)}
              className="transition-transform hover:scale-110"
              data-testid={`button-${field}-star-${star}`}
            >
              <Star
                className={`h-6 w-6 ${
                  star <= displayValue
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    );
  };

  const canSubmit = overallRating > 0 && bookCondition > 0 && communication > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      submitRatingMutation.mutate();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="max-w-xl w-full max-h-[90vh] overflow-y-auto m-4" data-testid="dialog-swap-rating">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold">Rate Your Swap Partner</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Share your experience swapping with {partnerName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover-elevate rounded-md"
              data-testid="button-close-rating"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            {renderStarRating(
              'overall',
              overallRating,
              setOverallRating,
              'Overall Experience',
              <Star className="h-4 w-4 text-yellow-500" />
            )}

            {renderStarRating(
              'bookCondition',
              bookCondition,
              setBookCondition,
              'Book Condition',
              <Package className="h-4 w-4 text-blue-500" />
            )}

            {renderStarRating(
              'communication',
              communication,
              setCommunication,
              'Communication',
              <MessageCircle className="h-4 w-4 text-green-500" />
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-purple-500" />
                <label className="block text-sm font-medium">Delivery Timeliness</label>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setOnTime(true)}
                  className={`flex-1 px-4 py-2 rounded-md border transition-colors ${
                    onTime
                      ? 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  data-testid="button-ontime-yes"
                >
                  On Time
                </button>
                <button
                  type="button"
                  onClick={() => setOnTime(false)}
                  className={`flex-1 px-4 py-2 rounded-md border transition-colors ${
                    !onTime
                      ? 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  data-testid="button-ontime-no"
                >
                  Delayed
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="comment" className="block text-sm font-medium">
                Additional Comments (Optional)
              </label>
              <textarea
                id="comment"
                placeholder="Share more details about your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="textarea-comment"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitRatingMutation.isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!canSubmit || submitRatingMutation.isPending}
                data-testid="button-submit-rating"
              >
                {submitRatingMutation.isPending ? 'Submitting...' : 'Submit Rating'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
