import { cx } from '../shared/cx';
import type { CSSProperties, ReactNode } from 'react';

export default function CollectionCard({
  label,
  action,
  onOpen,
  className = '',
  style,
  children,
}: {
  label: string;
  action: string;
  onOpen: () => void;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <article
      className={cx(
        'relative flex flex-col min-w-0 p-4.5 border rounded-card border-line/70 bg-surface [transition:border-color_150ms,_box-shadow_150ms] hover:border-accent-line hover:shadow-[0_4px_18px] hover:shadow-ink/4 focus-within:border-accent-line focus-within:shadow-[0_4px_18px] focus-within:shadow-ink/4 ',
        className,
      )}
      aria-label={label}
      style={style}
    >
      <button
        type="button"
        className="absolute inset-0 z-1 border-0 rounded-[inherit] p-0 bg-transparent cursor-pointer focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-accent focus-visible:outline-offset-2"
        aria-label={`${action}：${label}`}
        title={label}
        onClick={onOpen}
      />
      {children}
    </article>
  );
}
