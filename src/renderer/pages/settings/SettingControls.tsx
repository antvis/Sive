import type { ComponentProps, ReactNode } from 'react';
import { useId } from 'react';
import { Input } from '../../components/ui/input';

export function SettingGroup({
  title,
  description,
  action,
  children,
}: {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      {(title || description || action) && (
        <header className="mb-3 px-4">
          {(title || action) && (
            <div className="flex items-baseline gap-3">
              {title && <h2 className="m-0 text-sm font-medium text-muted-foreground">{title}</h2>}
              {action && <div className="ml-auto shrink-0">{action}</div>}
            </div>
          )}
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
}: ComponentProps<typeof Input> & { label: string; description: string }) {
  const id = useId();
  const descriptionId = `${id}-description`;

  return (
    <div className="grid gap-1.5 text-sm">
      <label htmlFor={id}>{label}</label>
      <p id={descriptionId} className="m-0 text-xs text-muted-foreground">
        {description}
      </p>
      <Input {...props} id={id} aria-describedby={descriptionId} />
    </div>
  );
}
