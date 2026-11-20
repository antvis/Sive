'use client';

import type { ComponentProps } from 'react';
import { defaultComponents } from 'streamdown';
import { cn } from '../../lib/utils';
import { Table } from '../ui/table';

export function MarkdownTable(props: ComponentProps<typeof defaultComponents.table>) {
  return (
    <div
      className={cn(
        'relative min-w-0 *:my-0 *:rounded-none *:border-0 *:bg-transparent *:p-0',
        '[&>div>div:last-child]:rounded-none [&>div>div:last-child]:border-0',
        '[&>div>div:not(:last-child)]:absolute [&>div>div:not(:last-child)]:top-1 [&>div>div:not(:last-child)]:right-1 [&>div>div:not(:last-child)]:z-10',
        '[&>div>div:not(:last-child)]:rounded-md [&>div>div:not(:last-child)]:border [&>div>div:not(:last-child)]:border-border [&>div>div:not(:last-child)]:bg-background/95 [&>div>div:not(:last-child)]:p-1',
        '[&>div>div:not(:last-child)]:pointer-events-none [&>div>div:not(:last-child)]:opacity-0 [&>div>div:not(:last-child)]:transition-opacity',
        'hover:[&>div>div:not(:last-child)]:pointer-events-auto hover:[&>div>div:not(:last-child)]:opacity-100 focus-within:[&>div>div:not(:last-child)]:pointer-events-auto focus-within:[&>div>div:not(:last-child)]:opacity-100',
      )}
    >
      <Table asChild>
        <defaultComponents.table {...props} />
      </Table>
    </div>
  );
}
