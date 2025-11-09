import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { Input } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import { api } from '../../lib/api';
import type { CreateClub } from '@repo/types';
import { BOOK_GENRES } from '@repo/types';
import { AIDisabledBanner } from '../../components/ai/AIDisabledBanner';

export function ClubFormPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState<CreateClub>({
    name: '',
    description: undefined,
    genres: [],
    imageUrl: undefined,
    maxMembers: 50,
    isPublic: true,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateClub) => api.createClub(data),
    onSuccess: (club) => {
      queryClient.invalidateQueries({ queryKey: ['/api/clubs'] });
      setError('');
      setLocation(`/clubs/${club.id}`);
    },
    onError: (error: Error) => {
      const errorMessage = error.message || 'Failed to create club';
      
      if (errorMessage.includes('Authentication required') || errorMessage.includes('not authorized')) {
        setError('Please create an account or login first to create a club');
        setTimeout(() => setLocation('/auth/sign-in'), 3000);
      } else {
        setError(errorMessage);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto p-6">
        <PageHeader
          title="Create Book Club"
          description="Start a new book club and invite members"
        />

        <Card className="p-6 mt-6">
          <AIDisabledBanner />
          
          {error && (
            <div
              className="mb-4 p-4 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-md"
              data-testid="text-error"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Club Name *
              </label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                data-testid="input-name"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value || undefined })}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 min-h-24"
                placeholder="Describe your book club..."
                data-testid="textarea-description"
              />
            </div>

            <fieldset>
              <legend className="block text-sm font-medium mb-3">
                Genres
              </legend>
              <div 
                className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border rounded-md bg-background dark:bg-gray-800 dark:border-gray-700 max-h-64 overflow-y-auto"
                aria-describedby="genres-help-text"
              >
                {BOOK_GENRES.map((genre) => (
                  <label
                    key={genre}
                    className="flex items-center space-x-2 cursor-pointer hover-elevate p-2 rounded-md"
                  >
                    <input
                      type="checkbox"
                      checked={formData.genres.includes(genre.toLowerCase())}
                      onChange={(e) => {
                        const genreLower = genre.toLowerCase();
                        if (e.target.checked) {
                          setFormData({ ...formData, genres: [...formData.genres, genreLower] });
                        } else {
                          setFormData({ ...formData, genres: formData.genres.filter(g => g !== genreLower) });
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300"
                      data-testid={`checkbox-genre-${genre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                      aria-label={genre}
                    />
                    <span className="text-sm">{genre}</span>
                  </label>
                ))}
              </div>
              <p id="genres-help-text" className="text-xs text-muted-foreground mt-2">
                Select the genres your club will focus on
              </p>
            </fieldset>

            <div>
              <label htmlFor="maxMembers" className="block text-sm font-medium mb-2">
                Maximum Members
              </label>
              <Input
                id="maxMembers"
                type="number"
                min="2"
                max="1000"
                value={formData.maxMembers}
                onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) })}
                required
                data-testid="input-maxmembers"
              />
            </div>

            <div className="flex items-center">
              <input
                id="isPublic"
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                className="mr-2"
                data-testid="checkbox-ispublic"
              />
              <label htmlFor="isPublic" className="text-sm">
                Make this club public (anyone can join)
              </label>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                data-testid="button-submit"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Club'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation('/clubs')}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
