import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Tool, ToolHeader } from '../ai-elements/tool';
import type { ToolPart } from '../ai-elements/tool';
import { CollapsibleInlineContent } from '../ui/collapsible';

export function ToolCallView({
  call,
  title,
  icon: Icon,
  state: toolState = call.state,
  expandOn = 'running',
  children,
}: {
  call: ToolPart;
  title: string;
  icon?: LucideIcon;
  state?: ToolPart['state'];
  expandOn?: 'running' | 'completed' | 'click' | 'never';
  children?: ReactNode;
}) {
  const preliminary = expandOn !== 'running' && call.state === 'output-available' && call.preliminary;
  const state = preliminary ? 'input-available' : toolState;
  const completed = state === 'output-available' || state === 'output-error' || state === 'output-denied';
  const canExpand = expandOn === 'running' || (completed && expandOn !== 'never');
  const defaultExpanded = expandOn === 'running' ? !completed : completed && expandOn === 'completed';
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);

  return (
    <Tool disabled={!canExpand} open={canExpand && expanded} onOpenChange={setExpanded}>
      <ToolHeader
        state={state}
        title={title}
        icon={Icon ? <Icon className="size-4 text-muted-foreground" aria-hidden="true" /> : undefined}
      />
      <CollapsibleInlineContent>{children}</CollapsibleInlineContent>
    </Tool>
  );
}
