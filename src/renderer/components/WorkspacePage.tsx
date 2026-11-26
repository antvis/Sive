import type { PropsWithChildren, ReactNode } from 'react';

type Props = PropsWithChildren<{
  title: string;
  description: ReactNode;
  action?: ReactNode;
}>;

export function WorkspacePage({ title, description, action, children }: Props) {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-7 pt-4 pb-12 lg:px-10 motion-safe:animate-fade-up">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="m-0 text-3xl leading-tight font-semibold tracking-tight text-balance">{title}</h1>
          <p className="mt-2 mb-0 max-w-150 leading-[1.7] text-pretty text-muted-foreground">
            {description}
          </p>
        </div>
        {action}
      </header>
      {children}
    </div>
  );
}
