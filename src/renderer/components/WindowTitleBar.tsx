import clsx from 'clsx';
import type { ComponentProps } from 'react';

export function WindowTitleBar({ className, ...props }: ComponentProps<'header'>) {
  return (
    <header
      {...props}
      className={clsx(
        'flex h-(--workspace-titlebar-height) min-w-0 items-center [-webkit-app-region:drag]',
        className,
      )}
    />
  );
}
