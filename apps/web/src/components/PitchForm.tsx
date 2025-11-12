import { useState } from 'react';
import { Input } from '@repo/ui';
import { Button } from '@repo/ui';
import { BOOK_GENRES, type CreatePitch } from '@repo/types';
import { ImageIcon, Video, Tag, Check } from 'lucide-react';

interface PitchFormData {
  title: string;
  blurb: string;
  targetClubId: string;
  genres: string[];
  theme: string;
  imageUrl: string;
  videoUrl: string;
}

interface PitchFormProps {
  onSubmit: (data: CreatePitch) => void;
  isPending: boolean;
  clubs: Array<{ id: string; name: string }>;
}

export function PitchForm({ onSubmit, isPending, clubs }: PitchFormProps) {
  const [formData, setFormData] = useState<PitchFormData>({
    title: '',
    blurb: '',
    targetClubId: '',
    genres: [],
    theme: '',
    imageUrl: '',
    videoUrl: '',
  });

  const [genreError, setGenreError] = useState('');

  const handleGenreToggle = (genre: string) => {
    setGenreError('');
    const currentGenres = formData.genres;
    
    if (currentGenres.includes(genre)) {
      // Remove genre
      setFormData({
        ...formData,
        genres: currentGenres.filter(g => g !== genre),
      });
    } else {
      // Add genre if under limit
      if (currentGenres.length >= 3) {
        setGenreError('Maximum 3 genres allowed');
        return;
      }
      setFormData({
        ...formData,
        genres: [...currentGenres, genre],
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate genres
    if (formData.genres.length === 0) {
      setGenreError('Please select at least one genre');
      return;
    }
    
    // Prepare submission data (remove empty optional fields)
    const submitData: CreatePitch = {
      title: formData.title,
      blurb: formData.blurb,
      targetClubId: formData.targetClubId || undefined,
      genres: formData.genres.length > 0 ? formData.genres : undefined,
      theme: formData.theme.trim() || undefined,
      imageUrl: formData.imageUrl.trim() || undefined,
      videoUrl: formData.videoUrl.trim() || undefined,
    };
    
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Book Title */}
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
          maxLength={200}
        />
      </div>

      {/* Genres - Multi-select with max 3 */}
      <div>
        <label className="block text-sm font-medium mb-3">
          Genres * (Select up to 3)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {BOOK_GENRES.map((genre) => {
            const isSelected = formData.genres.includes(genre);
            return (
              <button
                key={genre}
                type="button"
                onClick={() => handleGenreToggle(genre)}
                data-testid={`button-genre-${genre}`}
                className={`
                  flex items-center justify-between gap-2 px-3 py-2 rounded-md border text-sm
                  hover-elevate active-elevate-2 transition-colors
                  ${isSelected 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-background border-border'}
                `}
              >
                <span>{genre}</span>
                {isSelected && <Check className="w-4 h-4" />}
              </button>
            );
          })}
        </div>
        {genreError && (
          <p className="text-sm text-destructive mt-2" data-testid="text-genre-error">
            {genreError}
          </p>
        )}
        {formData.genres.length > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            Selected: {formData.genres.join(', ')} ({formData.genres.length}/3)
          </p>
        )}
      </div>

      {/* Theme */}
      <div>
        <label htmlFor="theme" className="block text-sm font-medium mb-2 flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Theme / Topic
        </label>
        <Input
          id="theme"
          value={formData.theme}
          onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
          placeholder="e.g., Coming of age, redemption, family bonds..."
          data-testid="input-pitch-theme"
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Optional: What themes or topics does your book explore?
        </p>
      </div>

      {/* Pitch Description */}
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
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Image URL */}
      <div>
        <label htmlFor="imageUrl" className="block text-sm font-medium mb-2 flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          Pitch Image URL
        </label>
        <Input
          id="imageUrl"
          type="url"
          value={formData.imageUrl}
          onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
          placeholder="https://example.com/book-cover.jpg"
          data-testid="input-pitch-image"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Optional: URL to your book cover or promotional image
        </p>
      </div>

      {/* YouTube Video URL */}
      <div>
        <label htmlFor="videoUrl" className="block text-sm font-medium mb-2 flex items-center gap-2">
          <Video className="w-4 h-4" />
          YouTube Video URL
        </label>
        <Input
          id="videoUrl"
          type="url"
          value={formData.videoUrl}
          onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
          placeholder="https://www.youtube.com/watch?v=..."
          data-testid="input-pitch-video"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Optional: YouTube link to a book trailer or author introduction
        </p>
      </div>

      {/* Target Club */}
      <div>
        <label htmlFor="targetClubId" className="block text-sm font-medium mb-2">
          Target Club
        </label>
        <select
          id="targetClubId"
          value={formData.targetClubId}
          onChange={(e) => setFormData({ ...formData, targetClubId: e.target.value })}
          data-testid="select-target-club"
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Any club (recommended)</option>
          {clubs.map((club) => (
            <option key={club.id} value={club.id}>
              {club.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          Optional: Target a specific club or leave open for all clubs
        </p>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        data-testid="button-submit-pitch"
        className="w-full"
      >
        {isPending ? 'Submitting...' : 'Submit Pitch'}
      </Button>
    </form>
  );
}
