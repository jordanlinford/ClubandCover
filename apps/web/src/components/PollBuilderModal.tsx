import { useState } from 'react';
import { Button } from '@repo/ui';
import { Input } from '@repo/ui';
import { Card } from '@repo/ui';
import { X, Plus } from 'lucide-react';
import type { CreatePollFullRequest } from '@repo/types';

interface PollBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePoll: (pollRequest: CreatePollFullRequest) => void;
  isPending: boolean;
  clubId: string;
}

export function PollBuilderModal({ isOpen, onClose, onCreatePoll, isPending, clubId }: PollBuilderModalProps) {
  const [pollData, setPollData] = useState<{
    type: 'PITCH' | 'BOOK';
    title: string;
    description: string;
    opensAt: string;
    closesAt: string;
  }>({
    type: 'PITCH',
    title: '',
    description: '',
    opensAt: new Date().toISOString().slice(0, 16),
    closesAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  });

  const [options, setOptions] = useState<Array<{ text: string }>>([{ text: '' }, { text: '' }]);

  const handleAddOption = () => {
    setOptions([...options, { text: '' }]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index] = { text };
    setOptions(newOptions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.filter(o => o.text.trim());
    if (validOptions.length < 2) {
      alert('Please add at least 2 options');
      return;
    }
    
    // Combine poll data and options into a single request
    const pollRequest: CreatePollFullRequest = {
      clubId,
      type: pollData.type,
      title: pollData.title,
      description: pollData.description || undefined,
      opensAt: pollData.opensAt,
      closesAt: pollData.closesAt,
      options: validOptions,
    };
    
    onCreatePoll(pollRequest);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Create Poll</h2>
            <button
              onClick={onClose}
              className="p-1 hover-elevate rounded-md"
              data-testid="button-close-modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="poll-type" className="block text-sm font-medium mb-2">
                Poll Type *
              </label>
              <select
                id="poll-type"
                value={pollData.type}
                onChange={(e) => setPollData({ ...pollData, type: e.target.value as 'PITCH' | 'BOOK' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">
                  Poll Options * (at least 2)
                </label>
                <Button
                  type="button"
                  onClick={handleAddOption}
                  size="sm"
                  data-testid="button-add-option"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Option
                </Button>
              </div>

              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option.text}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      data-testid={`input-option-${index}`}
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        onClick={() => handleRemoveOption(index)}
                        variant="outline"
                        size="sm"
                        data-testid={`button-remove-option-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-create-poll"
              >
                {isPending ? 'Creating...' : 'Create Poll'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
