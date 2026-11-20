import type { ComponentProps } from 'react';
import { Slot } from 'radix-ui';
import { cn } from '../../lib/utils';

export function Table({
  className,
  asChild = false,
  ...props
}: ComponentProps<'table'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'table';

  return (
    <Comp
      data-slot="table"
      className={cn(
        'w-full border-collapse border-0 bg-card text-left text-[length:inherit] leading-5 text-foreground divide-y-0',
        '[&_th]:[font-size:inherit] [&_td]:[font-size:inherit] [&_code]:[font-size:inherit] [&_code]:[line-height:inherit]',
        '[&_thead]:bg-card [&_th]:border-0 [&_th]:border-b [&_th]:border-border [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground',
        '[&_th.text-right]:text-right [&_th.text-center]:text-center',
        '[&_tbody]:divide-y-0 [&_td]:border-0 [&_td]:border-b [&_td]:border-border/40 [&_td]:px-3 [&_td]:py-1.5 [&_td]:align-top',
        '[&_tbody_tr:last-child_td]:border-b-0 [&_tfoot_td]:border-t [&_tfoot_td]:border-b-0 [&_tfoot_td]:border-border [&_tfoot_td]:font-semibold',
        'max-[520px]:[&_th]:px-2 max-[520px]:[&_td]:px-2',
        className,
      )}
      {...props}
    />
  );
}
