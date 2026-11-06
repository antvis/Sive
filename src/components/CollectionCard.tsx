import { cx } from '../shared/cx';
import type { ReactNode } from 'react';

export default function CollectionCard({
  label,
  action,
  onOpen,
  className = '',
  children,
}: {
  label: string;
  action: string;
  onOpen: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <article
      className={cx(
        'relative flex flex-col min-w-0 p-4.5 border rounded-card border-[color-mix(in_srgb,_var(--border)_70%,_transparent)] bg-surface [transition:border-color_150ms,_box-shadow_150ms] hover:border-[color-mix(in_srgb,_var(--accent)_30%,_var(--border))] hover:shadow-[0_4px_18px_color-mix(in_srgb,_var(--text)_4%,_transparent)] focus-within:border-[color-mix(in_srgb,_var(--accent)_30%,_var(--border))] focus-within:shadow-[0_4px_18px_color-mix(in_srgb,_var(--text)_4%,_transparent)] ',
        className,
      )}
      aria-label={label}
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
