import { useState } from 'react';
import { Button } from '@repo/ui';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { api, ApiError } from '../../lib/api';

interface GenerateBlurbButtonProps {
  title: string;
  subtitle?: string;
  author: string;
  genres: string[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function GenerateBlurbButton({
  title,
  subtitle,
  author,
  genres,
  value,
  onChange,
  disabled = false,
}: GenerateBlurbButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [aiDisabled, setAiDisabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const [previousBlurb, setPreviousBlurb] = useState<string>('');

  const handleGenerate = async () => {
    if (!title || !author) {
      setError('Please fill in title and author first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPreviousBlurb(value);
    setShowUndo(false);

    try {
      const result = await api.generateBlurb({
        title,
        subtitle,
        author,
        genres,
        currentBlurb: value || undefined,
      });

      let blurb = result.blurb;

      // Safety: truncate to 120 words max
      const words = blurb.split(/\s+/);
      if (words.length > 120) {
        blurb = words.slice(0, 120).join(' ') + '...';
      }

      onChange(blurb);
      setShowUndo(!!value);
      
    } catch (error: any) {
      // Check for structured API error
      if (error instanceof ApiError) {
        if (error.code === 'AI_RATE_LIMIT') {
          setError(`Daily AI limit reached on this plan. Upgrade to Pro Author for more AI calls.`);
        } else if (error.status === 501 || error.code === 'AI_NOT_CONFIGURED') {
          setAiDisabled(true);
          setError('AI features are not available. Add OPENAI_API_KEY to enable.');
        } else {
          setError(error.message);
        }
      } else {
        setError(error.message || 'Failed to generate blurb');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndo = () => {
    onChange(previousBlurb);
    setShowUndo(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={disabled || isLoading || !title || !author || aiDisabled}
          data-testid="button-generate-blurb"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate blurb
            </>
          )}
        </Button>
        
        {showUndo && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            data-testid="button-undo-blurb"
          >
            Undo
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {aiDisabled && !error && (
        <p className="text-xs text-muted-foreground">
          AI is disabled—add OPENAI_API_KEY to enable.
        </p>
      )}
    </div>
  );
}
