import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

export function Slider({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  return (
    <input
      type="range"
      data-slot="slider"
      className={cn('w-full accent-control-checked disabled:opacity-45', className)}
      {...props}
    />
  );
}
