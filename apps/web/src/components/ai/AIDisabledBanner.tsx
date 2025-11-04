import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';

export function AIDisabledBanner() {
  const { data: config } = useQuery({
    queryKey: ['/api/debug/config'],
    queryFn: () => api.getConfig(),
  });

  if (!config || config.openaiBackend) {
    return null;
  }

  return (
    <div 
      className="flex items-center gap-2 p-3 mb-4 border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20 rounded-md"
      data-testid="banner-ai-disabled"
    >
      <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0" />
      <p className="text-sm text-yellow-800 dark:text-yellow-200">
        AI features are disabled. Add <code className="px-1 py-0.5 bg-yellow-100 dark:bg-yellow-900 rounded text-xs">OPENAI_API_KEY</code> to enable blurb generation and recommendations.
      </p>
    </div>
  );
}
