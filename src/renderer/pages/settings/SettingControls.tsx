import type { ComponentProps, ReactNode } from 'react';
import { useId } from 'react';
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
      <div className="divide-y divide-ink/7 rounded-[16px] bg-workspace-control/60 px-4 dark:bg-preview-row">
        {children}
      </div>
    </section>
  );
}

export function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4">
      <div className="min-w-[min(100%,9rem)] flex-1">
        <p className="m-0 text-base font-medium">{title}</p>
        <p className="mt-1 mb-0 text-sm leading-5 text-muted-foreground">{description}</p>
      </div>
      <div className="max-w-full shrink-0">{children}</div>
    </div>
  );
}

export function SettingField({
  label,
  description,
  ...props
}: ComponentProps<typeof SettingInput> & { label: string; description: string }) {
  const id = useId();
  const descriptionId = `${id}-description`;

  return (
    <div className="grid gap-1.5 text-sm">
      <label htmlFor={id}>{label}</label>
      <p id={descriptionId} className="m-0 text-xs text-muted-foreground">
        {description}
      </p>
      <SettingInput {...props} id={id} aria-describedby={descriptionId} />
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
