import { Popover as PopoverPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

export const Popover = PopoverPrimitive.Root;

export const PopoverTrigger = PopoverPrimitive.Trigger;

export function PopoverContent({
  className,
  sideOffset = 6,
  collisionPadding = 16,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          'relative z-50 min-w-44 overflow-x-hidden overflow-y-auto rounded-[10px] border border-border/60 bg-popover text-popover-foreground shadow-lg [--dropdown-enter-transform:translateY(-6px)] data-[side=top]:[--dropdown-enter-transform:translateY(6px)] data-[side=left]:[--dropdown-enter-transform:translateX(6px)] data-[side=right]:[--dropdown-enter-transform:translateX(-6px)] motion-safe:data-[state=open]:animate-dropdown-open motion-safe:data-[state=closed]:animate-dropdown-close',
          'max-h-(--radix-popover-content-available-height) max-w-(--radix-popover-content-available-width) origin-(--radix-popover-content-transform-origin) p-3 text-sm',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
