import type { ComponentProps, ReactNode } from 'react';
import { Input } from '../../components/ui/input';
import { cn } from '../../lib/utils';

export function SettingGroup({
  title,
  description,
  children,
}: {
  title?: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      {(title || description) && (
        <header className="mb-4">
          {title && <h2 className="m-0 text-lg font-semibold">{title}</h2>}
          {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
        </header>
      )}
      <div className="grid gap-6">{children}</div>
    </section>
  );
}

export function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <div className="min-w-[min(100%,12rem)] flex-1">
        <p className="m-0 text-base font-medium">{title}</p>
        {description && <p className="mt-1 mb-0 text-sm leading-5 text-muted-foreground">{description}</p>}
      </div>
      <div className="max-w-full shrink-0">{children}</div>
    </div>
  );
}

export function SettingInput({ className, ...props }: ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className={cn(
        'rounded-lg border-0 bg-workspace-control focus-visible:ring-2 focus-visible:ring-sidebar-focus',
        className,
      )}
    />
  );
}
