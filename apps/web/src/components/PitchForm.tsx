import { useState } from 'react';
import { Input } from '@repo/ui';
import { Button } from '@repo/ui';
import { BOOK_GENRES, BookFormat, type CreatePitch } from '@repo/types';
import { ImageIcon, Video, Tag, Check, BookOpen, Gift, AlertCircle } from 'lucide-react';

interface PitchFormData {
  title: string;
  blurb: string;
  targetClubId: string;
  genres: string[];
  theme: string;
  imageUrl: string;
  videoUrl: string;
  availableFormats: string[];
  offerFreeIfChosen: boolean;
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
    availableFormats: [],
    offerFreeIfChosen: false,
  });

  const [genreError, setGenreError] = useState('');
  const [formatError, setFormatError] = useState('');

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

  const handleFormatToggle = (format: string) => {
    setFormatError('');
    const currentFormats = formData.availableFormats;
    
    if (currentFormats.includes(format)) {
      // Remove format
      setFormData({
        ...formData,
        availableFormats: currentFormats.filter(f => f !== format),
      });
    } else {
      // Add format
      setFormData({
        ...formData,
        availableFormats: [...currentFormats, format],
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
    
    // Validate formats
    if (formData.availableFormats.length === 0) {
      setFormatError('Please select at least one format');
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
      availableFormats: formData.availableFormats.length > 0 ? formData.availableFormats : undefined,
      offerFreeIfChosen: formData.offerFreeIfChosen,
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

      {/* Available Formats */}
      <div>
        <label className="block text-sm font-medium mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Available Formats * (Select all that apply)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {Object.values(BookFormat).map((format) => {
            const isSelected = formData.availableFormats.includes(format);
            return (
              <button
                key={format}
                type="button"
                onClick={() => handleFormatToggle(format)}
                data-testid={`button-format-${format}`}
                className={`
                  flex items-center justify-between gap-2 px-3 py-2 rounded-md border text-sm
                  hover-elevate active-elevate-2 transition-colors
                  ${isSelected 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-background border-border'}
                `}
              >
                <span>{format.replace('_', ' ')}</span>
                {isSelected && <Check className="w-4 h-4" />}
              </button>
            );
          })}
        </div>
        {formatError && (
          <p className="text-sm text-destructive mt-2" data-testid="text-format-error">
            {formatError}
          </p>
        )}
        {formData.availableFormats.length > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            Selected: {formData.availableFormats.join(', ')}
          </p>
        )}
      </div>

      {/* Offer Free If Chosen */}
      <div className="border border-border rounded-md p-4 space-y-3">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="offerFreeIfChosen"
            checked={formData.offerFreeIfChosen}
            onChange={(e) => setFormData({ ...formData, offerFreeIfChosen: e.target.checked })}
            data-testid="checkbox-offer-free"
            className="mt-1 h-4 w-4 rounded border-border"
          />
          <div className="flex-1">
            <label htmlFor="offerFreeIfChosen" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
              <Gift className="w-4 h-4" />
              Offer book for free if chosen
            </label>
            <p className="text-xs text-muted-foreground mt-1">
              Commit to providing this book at no cost to the club if selected
            </p>
          </div>
        </div>
        
        {formData.offerFreeIfChosen && formData.availableFormats.some(f => f === 'PAPERBACK' || f === 'HARDCOVER') && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-900 dark:text-amber-200">
              Physical format selected: You'll be responsible for shipping costs if your book is chosen
            </p>
          </div>
        )}
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
