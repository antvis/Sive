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
    <article className={`collection-card ${className}`} aria-label={label}>
      <button
        type="button"
        className="collection-card-open"
        aria-label={`${action}：${label}`}
        title={label}
        onClick={onOpen}
      />
      {children}
    </article>
  );
}
