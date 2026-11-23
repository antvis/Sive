import type { CSSProperties } from 'react';
import { toast } from 'sonner';
import { CodeBlockCopyButton } from 'streamdown';
import { cn } from '../../lib/utils';
import { errorMessage } from '../../utils';
import { CodeBlock } from './code-block';

export function SqlCodeBlock({
  code,
  label = 'SQL',
  maxHeight,
}: {
  code: string;
  label?: string;
  maxHeight?: string;
}) {
  return (
    <CodeBlock
      code={code}
      language="sql"
      role="region"
      aria-label={label}
      style={maxHeight ? ({ '--sql-max-height': maxHeight } as CSSProperties) : undefined}
      className={cn(
        'group/sql rounded-none border-0 bg-transparent text-[length:inherit] [&>div:last-child]:overflow-x-hidden [&_pre]:py-1 [&_pre]:pr-9 [&_pre]:pl-0 [&_pre]:whitespace-pre-wrap [&_pre]:[overflow-wrap:anywhere]',
        maxHeight &&
          '[&>div:last-child]:max-h-(--sql-max-height) [&>div:last-child]:overflow-y-auto [&>div:last-child]:overscroll-contain [&>div:last-child]:[scrollbar-gutter:stable]',
      )}
    >
      <div className="pointer-events-none absolute top-1 right-1 z-10 flex items-center justify-end gap-1 rounded-md border border-border bg-background/95 p-1 opacity-0 transition-opacity group-focus-within/sql:pointer-events-auto group-focus-within/sql:opacity-100 group-hover/sql:pointer-events-auto group-hover/sql:opacity-100 [&_svg]:size-3.5">
        <CodeBlockCopyButton
          code={code}
          aria-label="复制完整 SQL"
          title="复制完整 SQL"
          onError={(error) => toast.error(errorMessage(error))}
        />
      </div>
    </CodeBlock>
  );
}
