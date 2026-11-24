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
        <header className="mb-3 px-4">
          {title && <h2 className="m-0 text-lg font-semibold">{title}</h2>}
          {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
        </header>
      )}
      <div className="divide-y divide-ink/10 rounded-[16px] bg-workspace-control px-4">{children}</div>
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
    <div className="flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4">
      <div className="min-w-[min(100%,9rem)] flex-1">
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
        'rounded-[10px] border-ink/10 bg-workspace-control-active focus-visible:ring-2 focus-visible:ring-sidebar-focus',
        className,
      )}
    />
  );
}
