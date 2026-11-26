import { Tabs as TabsPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn('flex flex-wrap items-stretch gap-1 rounded-lg bg-workspace-control p-0.5', className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'flex min-h-7 min-w-0 items-center justify-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium text-muted-foreground -outline-offset-1 transition-colors hover:text-ink data-[state=active]:bg-selected data-[state=active]:text-selected-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        'min-w-0 focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-ring',
        className,
      )}
      {...props}
    />
  );
}
