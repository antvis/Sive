import { useRef } from 'react';
import type { ComponentProps, PropsWithChildren } from 'react';
import { cn } from '../../lib/utils';
import { Input } from './input';

export function SidebarButton({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      data-sidebar-row
      data-slot="sidebar-button"
      className={cn(
        'relative flex min-h-[var(--sidebar-row-height,34px)] min-w-0 items-center gap-2 rounded-lg px-2.5 text-left text-sidebar-text -outline-offset-1 transition-[background-color,color,scale] motion-safe:active:scale-[0.98] disabled:opacity-45 [&:not([data-sidebar-list]_*)]:hover:bg-sidebar-highlight [&[aria-current=true]]:bg-sidebar-selected [&[aria-current=true]]:text-selected-foreground aria-[current=true]:font-semibold',
        className,
      )}
      {...props}
    />
  );
}

export function SidebarInput(props: ComponentProps<typeof Input>) {
  return <Input className="h-[var(--sidebar-row-height,34px)] rounded-lg px-2 text-base" {...props} />;
}

export function SidebarList({ children, className }: PropsWithChildren<{ className?: string }>) {
  const highlight = useRef<HTMLSpanElement>(null);

  return (
    <div className={className}>
      <div
        className="relative grid gap-[var(--sidebar-row-gap,3px)] overflow-clip"
        data-sidebar-list
        onPointerOver={(event) => {
          if (event.pointerType === 'touch' || !highlight.current || !(event.target instanceof Element))
            return;
          const row = event.target.closest('[data-sidebar-row]');
          if (
            !row ||
            row.closest('[data-sidebar-list]') !== event.currentTarget ||
            row.matches(':disabled')
          ) {
            highlight.current.style.opacity = '0';
            return;
          }
          const list = event.currentTarget.getBoundingClientRect();
          const bounds = row.getBoundingClientRect();
          Object.assign(highlight.current.style, {
            transform: `translate(${bounds.left - list.left}px, ${bounds.top - list.top}px)`,
            width: `${bounds.width}px`,
            height: `${bounds.height}px`,
            opacity: '1',
          });
        }}
        onPointerLeave={() => {
          if (highlight.current) highlight.current.style.opacity = '0';
        }}
      >
        <span
          ref={highlight}
          aria-hidden
          className="pointer-events-none absolute start-0 top-0 rounded-lg bg-sidebar-highlight opacity-0 transition-[transform,width,height,opacity] duration-[220ms] ease-[cubic-bezier(.23,1,.32,1)] motion-reduce:transition-none"
        />
        {children}
      </div>
    </div>
  );
}
