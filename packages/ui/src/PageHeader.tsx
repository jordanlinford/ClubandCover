import { type ReactNode, type HTMLAttributes } from 'react';
import { cn } from './utils';

export interface PageHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div className={cn('pb-8 border-b mb-8', className)} {...props}>
      {breadcrumbs && <div className="mb-4 text-sm">{breadcrumbs}</div>}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-none">
            {title}
          </h1>
          {description && (
            <p className="text-lg text-muted-foreground leading-relaxed">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
