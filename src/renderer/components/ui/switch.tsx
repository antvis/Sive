import { Switch as SwitchPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

export function Switch({
  className,
  ...props
}: Omit<ComponentProps<typeof SwitchPrimitive.Root>, 'asChild' | 'children'>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'flex h-6 w-11 items-center rounded-full bg-ink/17 p-0.5 transition-[background-color] data-[state=checked]:bg-control-checked disabled:opacity-45',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="size-5 rounded-full bg-white shadow-xs motion-safe:transition-transform data-[state=checked]:translate-x-5" />
    </SwitchPrimitive.Root>
  );
}
