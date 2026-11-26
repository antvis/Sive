import { Slot } from 'radix-ui';
import { useState } from 'react';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

const optionSelector =
  ':is([role="option"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"])';

export function DropdownList({
  asChild,
  children,
  className,
  onFocusCapture,
  onBlurCapture,
  ...props
}: ComponentProps<'div'> & { asChild?: boolean }) {
  const [highlight, setHighlight] = useState({ top: 0, height: 0, visible: false, destructive: false });
  const Comp = asChild ? Slot.Root : 'div';

  return (
    <Comp
      {...props}
      data-dropdown-list=""
      className={cn('relative isolate', className)}
      onFocusCapture={(event) => {
        onFocusCapture?.(event);
        const item = event.target.closest<HTMLElement>(optionSelector);
        if (item?.closest('[data-dropdown-list]') !== event.currentTarget) return;

        let top = 0;
        for (let element: HTMLElement | null = item; element && element !== event.currentTarget;) {
          top += element.offsetTop;
          element = element.offsetParent as HTMLElement | null;
        }
        setHighlight({
          top,
          height: item.offsetHeight,
          visible: true,
          destructive: item.dataset.variant === 'destructive',
        });
      }}
      onBlurCapture={(event) => {
        onBlurCapture?.(event);
        const next = event.relatedTarget;
        if (next?.closest(optionSelector)?.closest('[data-dropdown-list]') === event.currentTarget) return;
        setHighlight((current) => (current.visible ? { ...current, visible: false } : current));
      }}
    >
      <span
        aria-hidden="true"
        data-slot="dropdown-highlight"
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 rounded-md motion-safe:transition-[transform,height,opacity] motion-safe:duration-[220ms] motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)]',
          highlight.destructive ? 'bg-destructive/10' : 'bg-selected',
        )}
        style={{
          height: highlight.height,
          transform: `translateY(${highlight.top}px)`,
          opacity: highlight.visible ? 1 : 0,
        }}
      />
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children}
    </Comp>
  );
}
