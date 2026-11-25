import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from './input-group';

export function Composer({ className, ...props }: ComponentProps<typeof InputGroup>) {
  return (
    <InputGroup
      className={cn(
        'gap-1.5 overflow-hidden rounded-[14px]! border-ink/10 bg-workspace-control-active p-1.5 shadow-xs transition-[border-color,box-shadow] duration-150 focus-within:ring-0! motion-reduce:transition-none! motion-reduce:**:transition-none!',
        className,
      )}
      {...props}
    />
  );
}

export function ComposerTextarea({
  className,
  rows = 2,
  ...props
}: ComponentProps<typeof InputGroupTextarea>) {
  return (
    <InputGroupTextarea
      rows={rows}
      className={cn(
        'max-h-25 min-h-[46px] px-1 py-[5px] text-base leading-[1.25] text-chat-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function ComposerFooter({
  className,
  ...props
}: Omit<ComponentProps<typeof InputGroupAddon>, 'align'>) {
  return (
    <InputGroupAddon
      align="block-end"
      className={cn('items-end justify-between gap-1 p-0', className)}
      {...props}
    />
  );
}

export function ComposerSubmitButton({
  className,
  ...props
}: Omit<ComponentProps<typeof InputGroupButton>, 'size' | 'variant'>) {
  return (
    <InputGroupButton
      size="icon-sm"
      variant="primary"
      className={cn(
        'size-7 shrink-0 rounded-lg transition-[background-color,color,transform] duration-200 active:translate-y-0 enabled:active:scale-[0.94] disabled:bg-border disabled:text-muted-foreground disabled:opacity-100',
        className,
      )}
      {...props}
    />
  );
}
