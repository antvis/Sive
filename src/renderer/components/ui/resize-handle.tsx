import type { ComponentProps } from 'react';
import { Separator } from 'react-resizable-panels';
import { cn } from '../../lib/utils';

export function ResizeHandle({ className, ...props }: ComponentProps<typeof Separator>) {
  return (
    <Separator
      className={cn(
        'relative w-(--workspace-gutter) touch-none [-webkit-app-region:no-drag] after:pointer-events-none after:absolute after:inset-y-0 after:start-1/2 after:w-0.5 after:-translate-x-1/2 after:rounded-full after:bg-linear-to-b after:from-transparent after:via-focus/65 after:to-transparent after:opacity-0 after:transition-opacity data-[separator=hover]:after:opacity-100 data-[separator=active]:after:opacity-100 focus-visible:outline-none focus-visible:after:opacity-100 motion-reduce:after:transition-none',
        className,
      )}
      {...props}
    />
  );
}
