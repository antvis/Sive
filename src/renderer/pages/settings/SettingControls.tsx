import type { ReactNode } from 'react';

export function SettingGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-5 overflow-hidden rounded-xl border">
      <div className="border-b bg-page px-5 py-4">
        <h2 className="m-0 text-base font-medium">{title}</h2>
        {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
      </div>
      <div className="divide-y">{children}</div>
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
    <div className="flex items-center justify-between gap-6 p-5 max-sm:flex-col max-sm:items-start">
      <div className="min-w-0 flex-1">
        <h3 className="m-0 text-base font-medium">{title}</h3>
        <p className="mt-1 mb-0 text-sm leading-5 text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
