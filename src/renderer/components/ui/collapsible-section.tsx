import type { LucideIcon } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import {
  Collapsible,
  CollapsibleInlineContent,
  CollapsibleInlineTrigger,
} from './collapsible';

type Props = PropsWithChildren<{
  title: string;
  icon?: LucideIcon;
  defaultOpen?: boolean;
}>;

export function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen,
  children,
}: Props) {
  return (
    <Collapsible defaultOpen={defaultOpen} role="region" aria-label={title}>
      <CollapsibleInlineTrigger>
        {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
        {title}
      </CollapsibleInlineTrigger>
      <CollapsibleInlineContent>
        <div
          tabIndex={0}
          className="max-h-[min(360px,48dvh)] overflow-y-auto rounded-sm focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-focus"
        >
          {children}
        </div>
      </CollapsibleInlineContent>
    </Collapsible>
  );
}
