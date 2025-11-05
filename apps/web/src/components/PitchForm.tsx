import { useState } from 'react';
import { Input } from '@repo/ui';
import { Button } from '@repo/ui';
import type { CreatePitch } from '@repo/types';

interface PitchFormProps {
  onSubmit: (data: CreatePitch) => void;
  isPending: boolean;
  clubs: Array<{ id: string; name: string }>;
}

export function PitchForm({ onSubmit, isPending, clubs }: PitchFormProps) {
  const [formData, setFormData] = useState<CreatePitch>({
    title: '',
    blurb: '',
    targetClubId: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-2">
          Book Title *
        </label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          data-testid="input-pitch-title"
          placeholder="Enter the book title"
        />
      </div>

      <div>
        <label htmlFor="blurb" className="block text-sm font-medium mb-2">
          Pitch Description *
        </label>
        <textarea
          id="blurb"
          value={formData.blurb}
          onChange={(e) => setFormData({ ...formData, blurb: e.target.value })}
          required
          data-testid="input-pitch-blurb"
          placeholder="Explain why this book would be great for the club..."
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="targetClubId" className="block text-sm font-medium mb-2">
          Target Club *
        </label>
        <select
          id="targetClubId"
          value={formData.targetClubId}
          onChange={(e) => setFormData({ ...formData, targetClubId: e.target.value })}
          required
          data-testid="select-target-club"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a club</option>
          {clubs.map((club) => (
            <option key={club.id} value={club.id}>
              {club.name}
            </option>
          ))}
        </select>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        data-testid="button-submit-pitch"
      >
        {isPending ? 'Submitting...' : 'Submit Pitch'}
      </Button>
    </form>
  );
}
