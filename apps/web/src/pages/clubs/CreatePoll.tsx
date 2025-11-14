import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, useLocation } from 'wouter';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { Input } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import { api } from '../../lib/api';
import { ArrowLeft, Plus, X, BookOpen, ThumbsUp } from 'lucide-react';
import type { CreatePollFullRequest } from '@repo/types';

type Pitch = {
  id: string;
  title: string;
  synopsis: string | null;
  book: {
    id: string;
    title: string;
    author: string;
    imageUrl: string | null;
  };
  nominationCount: number;
};

export function CreatePollPage() {
  const [, params] = useRoute('/clubs/:id/create-poll');
  const [, setLocation] = useLocation();
  const clubId = params?.id || '';
  const queryClient = useQueryClient();

  const [pollData, setPollData] = useState({
    type: 'PITCH' as 'PITCH' | 'BOOK',
    title: '',
    description: '',
    opensAt: new Date().toISOString().slice(0, 16),
    closesAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  });

  const [selectedPitches, setSelectedPitches] = useState<string[]>([]);
  const [customOptions, setCustomOptions] = useState<Array<{ text: string }>>([]);

  const { data: club } = useQuery<{ name: string }>({
    queryKey: ['/api/clubs', clubId],
    enabled: !!clubId,
  });

  // Fetch pitches with nominations
  const { data: pitchesData, isLoading } = useQuery({
    queryKey: ['/api/pitches', { targetClubId: clubId }],
    queryFn: async () => {
      const result = await api.get<{ pitches: Pitch[]; total: number }>(
        `/pitches?targetClubId=${clubId}&status=SUBMITTED&limit=50`
      );

      // Load nomination data for each pitch
      const pitchesWithNominations = await Promise.all(
        result.pitches.map(async (pitch) => {
          const nominationData = await api.get<{ count: number; userNominated: boolean }>(
            `/pitches/${pitch.id}/nominations`
          );
          return {
            ...pitch,
            nominationCount: nominationData.count,
          };
        })
      );

      // Sort by nominations
      const sorted = pitchesWithNominations.sort((a, b) => b.nominationCount - a.nominationCount);
      
      return {
        ...result,
        pitches: sorted,
      };
    },
    enabled: !!clubId,
  });

  // Auto-select top nominated pitches on load
  useEffect(() => {
    if (pitchesData && selectedPitches.length === 0) {
      const topNominated = pitchesData.pitches
        .filter(p => p.nominationCount > 0)
        .slice(0, 5)
        .map(p => p.id);
      
      if (topNominated.length >= 2) {
        setSelectedPitches(topNominated);
        setPollData(prev => ({
          ...prev,
          title: `Book Selection - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        }));
      }
    }
  }, [pitchesData, selectedPitches.length]);

  const createPollMutation = useMutation({
    mutationFn: (pollRequest: CreatePollFullRequest) =>
      api.post<any>('/polls', pollRequest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clubs', clubId, 'polls'] });
      setLocation(`/clubs/${clubId}/room`);
    },
  });

  const handleTogglePitch = (pitchId: string) => {
    setSelectedPitches(prev =>
      prev.includes(pitchId)
        ? prev.filter(id => id !== pitchId)
        : [...prev, pitchId]
    );
  };

  const handleAddCustomOption = () => {
    setCustomOptions([...customOptions, { text: '' }]);
  };

  const handleRemoveCustomOption = (index: number) => {
    setCustomOptions(customOptions.filter((_, i) => i !== index));
  };

  const handleCustomOptionChange = (index: number, text: string) => {
    const newOptions = [...customOptions];
    newOptions[index] = { text };
    setCustomOptions(newOptions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const pitchOptions = selectedPitches.map(pitchId => {
      const pitch = pitchesData?.pitches.find(p => p.id === pitchId);
      return {
        text: pitch ? `${pitch.book.title} by ${pitch.book.author}` : '',
        pitchId,
      };
    });

    const validCustomOptions = customOptions
      .filter(o => o.text.trim())
      .map(o => ({ text: o.text }));

    const allOptions = [...pitchOptions, ...validCustomOptions];

    if (allOptions.length < 2) {
      alert('Please select at least 2 options');
      return;
    }

    const pollRequest: CreatePollFullRequest = {
      clubId,
      type: pollData.type,
      title: pollData.title,
      description: pollData.description || undefined,
      opensAt: pollData.opensAt,
      closesAt: pollData.closesAt,
      options: allOptions,
    };

    createPollMutation.mutate(pollRequest);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-gray-600 dark:text-gray-400">Loading pitches...</p>
        </div>
      </div>
    );
  }

  const topNominated = pitchesData?.pitches.filter(p => p.nominationCount > 0) || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto p-6">
        <Button
          variant="outline"
          onClick={() => setLocation(`/clubs/${clubId}/pitches`)}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Pitches
        </Button>

        <PageHeader
          title={`Create Poll - ${club?.name || 'Club'}`}
          description="Select pitches from nominations or add custom options"
        />

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Poll Details */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Poll Details</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="poll-type" className="block text-sm font-medium mb-2">
                  Poll Type *
                </label>
                <select
                  id="poll-type"
                  value={pollData.type}
                  onChange={(e) => setPollData({ ...pollData, type: e.target.value as 'PITCH' | 'BOOK' })}
                  className="w-full px-3 py-2 border rounded-md"
                  data-testid="select-poll-type"
                >
                  <option value="PITCH">Book Pitch Selection</option>
                  <option value="BOOK">Book Selection</option>
                </select>
              </div>

              <div>
                <label htmlFor="poll-title" className="block text-sm font-medium mb-2">
                  Poll Title *
                </label>
                <Input
                  id="poll-title"
                  value={pollData.title}
                  onChange={(e) => setPollData({ ...pollData, title: e.target.value })}
                  required
                  data-testid="input-poll-title"
                  placeholder="e.g., Next Book Selection - February"
                />
              </div>

              <div>
                <label htmlFor="poll-description" className="block text-sm font-medium mb-2">
                  Description (optional)
                </label>
                <textarea
                  id="poll-description"
                  value={pollData.description || ''}
                  onChange={(e) => setPollData({ ...pollData, description: e.target.value })}
                  data-testid="input-poll-description"
                  placeholder="Add any additional context for voters..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="opensAt" className="block text-sm font-medium mb-2">
                    Opens At *
                  </label>
                  <input
                    type="datetime-local"
                    id="opensAt"
                    value={pollData.opensAt}
                    onChange={(e) => setPollData({ ...pollData, opensAt: e.target.value })}
                    required
                    data-testid="input-opens-at"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label htmlFor="closesAt" className="block text-sm font-medium mb-2">
                    Closes At *
                  </label>
                  <input
                    type="datetime-local"
                    id="closesAt"
                    value={pollData.closesAt}
                    onChange={(e) => setPollData({ ...pollData, closesAt: e.target.value })}
                    required
                    data-testid="input-closes-at"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Nominated Pitches */}
          {topNominated.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Select from Nominated Pitches ({topNominated.length} available)
              </h3>
              
              <div className="space-y-3">
                {topNominated.map((pitch) => (
                  <div
                    key={pitch.id}
                    className={`p-4 border rounded-md cursor-pointer transition-colors ${
                      selectedPitches.includes(pitch.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-300 dark:border-gray-700 hover-elevate'
                    }`}
                    onClick={() => handleTogglePitch(pitch.id)}
                    data-testid={`pitch-option-${pitch.id}`}
                  >
                    <div className="flex items-start gap-4">
                      {pitch.book.imageUrl && (
                        <img
                          src={pitch.book.imageUrl}
                          alt={pitch.book.title}
                          className="w-12 h-18 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{pitch.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {pitch.book.title} by {pitch.book.author}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <ThumbsUp className="h-4 w-4" />
                            <span>{pitch.nominationCount}</span>
                          </div>
                        </div>
                        {selectedPitches.includes(pitch.id) && (
                          <div className="mt-2 text-sm text-primary font-medium">
                            Selected for poll
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Custom Options */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Custom Options</h3>
              <Button
                type="button"
                onClick={handleAddCustomOption}
                size="sm"
                data-testid="button-add-custom-option"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Custom Option
              </Button>
            </div>

            {customOptions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Add custom options if you want to include books not from pitches
              </p>
            )}

            <div className="space-y-2">
              {customOptions.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={option.text}
                    onChange={(e) => handleCustomOptionChange(index, e.target.value)}
                    placeholder={`Custom option ${index + 1}`}
                    data-testid={`input-custom-option-${index}`}
                  />
                  <Button
                    type="button"
                    onClick={() => handleRemoveCustomOption(index)}
                    variant="outline"
                    size="sm"
                    data-testid={`button-remove-custom-option-${index}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          {/* Summary */}
          <Card className="p-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">Poll Summary</h3>
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {selectedPitches.length + customOptions.filter(o => o.text.trim()).length} total options
              ({selectedPitches.length} from nominations, {customOptions.filter(o => o.text.trim()).length} custom)
            </p>
            {(selectedPitches.length + customOptions.filter(o => o.text.trim()).length) < 2 && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                At least 2 options are required to create a poll
              </p>
            )}
          </Card>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              onClick={() => setLocation(`/clubs/${clubId}/pitches`)}
              variant="outline"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createPollMutation.isPending ||
                (selectedPitches.length + customOptions.filter(o => o.text.trim()).length) < 2
              }
              data-testid="button-create-poll"
            >
              {createPollMutation.isPending ? 'Creating...' : 'Create Poll'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
