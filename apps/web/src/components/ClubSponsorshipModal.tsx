import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { X, Calendar, Target } from 'lucide-react';

const SPONSORSHIP_DURATIONS = [
  {
    days: 7,
    label: '1 Week',
    creditsPerDay: 20,
    icon: Calendar,
  },
  {
    days: 14,
    label: '2 Weeks',
    creditsPerDay: 18,
    icon: Calendar,
    popular: true,
  },
  {
    days: 30,
    label: '1 Month',
    creditsPerDay: 15,
    icon: Calendar,
  },
];

const FREQUENCY_OPTIONS = [
  { value: 'DAILY', label: 'Daily', description: 'Show once per day' },
  { value: 'WEEKLY', label: 'Weekly', description: 'Show once per week' },
  { value: 'MONTHLY', label: 'Monthly', description: 'Show once per month' },
];

type ClubSponsorshipModalProps = {
  isOpen: boolean;
  onClose: () => void;
  pitchId: string;
  pitchTitle: string;
  clubId?: string;
  clubName?: string;
  currentBalance?: number;
};

export function ClubSponsorshipModal({
  isOpen,
  onClose,
  pitchId,
  pitchTitle,
  clubId,
  clubName,
  currentBalance = 0,
}: ClubSponsorshipModalProps) {
  const [selectedDuration, setSelectedDuration] = useState(SPONSORSHIP_DURATIONS[1]);
  const [selectedFrequency, setSelectedFrequency] = useState(FREQUENCY_OPTIONS[0].value);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const totalCredits = selectedDuration.days * selectedDuration.creditsPerDay;

  const sponsorMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/sponsorships/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          pitchId,
          clubId,
          durationDays: selectedDuration.days,
          frequency: selectedFrequency,
          creditsPerDay: selectedDuration.creditsPerDay,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.code === 'INSUFFICIENT_CREDITS') {
          throw new Error(
            `Insufficient credits. You have ${errorData.currentBalance} credits but need ${errorData.required} credits.`
          );
        }
        throw new Error(errorData.error || 'Sponsorship failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pitches', pitchId] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sponsorships'] });
      setError('');
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create sponsorship');
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="modal-club-sponsorship">
      <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold" data-testid="text-modal-title">Sponsor Club</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Pitch: "{pitchTitle}"
              </p>
              {clubName && (
                <p className="text-sm text-muted-foreground">
                  Club: {clubName}
                </p>
              )}
              <p className="text-sm font-medium mt-2">
                Available: <span className="text-primary" data-testid="text-current-balance">{currentBalance} credits</span>
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="button-close-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive" data-testid="text-error">
              {error}
            </div>
          )}

          <div className="mb-6">
            <h3 className="font-semibold mb-3">Sponsorship Duration</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {SPONSORSHIP_DURATIONS.map((duration) => {
                const Icon = duration.icon;
                const isSelected = selectedDuration.days === duration.days;
                const cost = duration.days * duration.creditsPerDay;
                const canAfford = currentBalance >= cost;

                return (
                  <Card
                    key={duration.days}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-primary' : ''
                    } ${duration.popular ? 'border-primary' : ''} ${
                      !canAfford ? 'opacity-50' : ''
                    }`}
                    onClick={() => canAfford && setSelectedDuration(duration)}
                    data-testid={`card-duration-${duration.days}`}
                  >
                    {duration.popular && (
                      <div className="text-xs font-semibold text-primary mb-2" data-testid="text-popular">
                        BEST VALUE
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold">{duration.label}</h4>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div>{duration.creditsPerDay} credits/day</div>
                      <div className="font-bold text-lg mt-2 text-foreground" data-testid={`text-cost-${duration.days}`}>
                        {cost} credits
                      </div>
                      {!canAfford && (
                        <div className="text-destructive font-medium mt-1" data-testid={`text-insufficient-${duration.days}`}>
                          Insufficient credits
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-3">Display Frequency</h3>
            <div className="grid md:grid-cols-3 gap-3">
              {FREQUENCY_OPTIONS.map((freq) => (
                <Card
                  key={freq.value}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedFrequency === freq.value ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedFrequency(freq.value)}
                  data-testid={`card-frequency-${freq.value}`}
                >
                  <h4 className="font-semibold mb-1">{freq.label}</h4>
                  <p className="text-sm text-muted-foreground">{freq.description}</p>
                </Card>
              ))}
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Sponsorship Benefits
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong>Targeted exposure:</strong> Your pitch appears prominently in the club's feed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong>Engaged audience:</strong> Reach active readers interested in your genre</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong>Track performance:</strong> Monitor impressions, clicks, and conversions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong>Build relationships:</strong> Connect directly with potential readers</span>
              </li>
            </ul>
          </div>

          <div className="border-t pt-4 mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium">{selectedDuration.label}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Frequency</span>
              <span className="font-medium">{FREQUENCY_OPTIONS.find(f => f.value === selectedFrequency)?.label}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Cost per day</span>
              <span className="font-medium">{selectedDuration.creditsPerDay} credits</span>
            </div>
            <div className="flex justify-between font-bold text-lg mt-3 pt-3 border-t">
              <span>Total Cost</span>
              <span className="text-primary" data-testid="text-total-cost">{totalCredits} credits</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={() => sponsorMutation.mutate()}
              disabled={sponsorMutation.isPending || currentBalance < totalCredits}
              className="flex-1"
              data-testid="button-sponsor"
            >
              {sponsorMutation.isPending
                ? 'Processing...'
                : `Sponsor for ${totalCredits} Credits`}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
