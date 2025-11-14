import { CheckCircle } from 'lucide-react';

interface VerifiedAuthorBadgeProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function VerifiedAuthorBadge({ 
  className = '', 
  showText = false,
  size = 'md' 
}: VerifiedAuthorBadgeProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <span 
      className={`inline-flex items-center gap-1 ${className}`}
      title="Verified Author"
      data-testid="badge-verified-author"
    >
      <CheckCircle className={`${sizeClasses[size]} text-green-600 dark:text-green-400`} />
      {showText && (
        <span className="text-sm font-medium text-green-600 dark:text-green-400">
          Verified
        </span>
      )}
    </span>
  );
}
