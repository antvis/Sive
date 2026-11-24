import type { LucideIcon } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { cn } from '../../lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleRowTrigger } from './collapsible';

type Props = PropsWithChildren<{
  title: string;
  icon?: LucideIcon;
  variant?: 'inline' | 'panel';
  defaultOpen?: boolean;
}>;

export function CollapsibleSection({
  title,
  icon: Icon,
  variant = 'inline',
  defaultOpen = variant === 'panel',
  children,
}: Props) {
  const panel = variant === 'panel';

  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className={cn('min-w-0 space-y-1.5', panel && 'border-t border-border pt-3 first:border-t-0 first:pt-0')}
      role="region"
      aria-label={title}
    >
      <CollapsibleRowTrigger
        className={cn(
          'text-sm font-semibold text-foreground',
          panel && 'px-2 text-base font-medium',
        )}
      >
        {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
        <span className="flex-1">{title}</span>
      </CollapsibleRowTrigger>
      <CollapsibleContent
        tabIndex={panel ? 0 : undefined}
        className={cn(
          'min-w-0',
          panel &&
            'max-h-[min(360px,48dvh)] overflow-y-auto overscroll-y-auto rounded-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring **:overscroll-y-auto!',
        )}
      >
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
