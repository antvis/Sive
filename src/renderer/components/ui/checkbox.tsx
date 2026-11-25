import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

export function Checkbox({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      className={cn('size-4 shrink-0 accent-control-checked disabled:opacity-45', className)}
      {...props}
    />
  );
}
