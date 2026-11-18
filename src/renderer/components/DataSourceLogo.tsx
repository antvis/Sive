import { Database } from '@phosphor-icons/react';
import { findDatasetSource } from '../utils/dataSource';

export function DataSourceLogo({ type, size }: { type: string; size: number }) {
  const source = findDatasetSource(type);
  return source ? (
    <img
      src={source.logo}
      width={size}
      height={size}
      className="shrink-0 object-contain [[data-theme=dark]_&]:brightness-150"
      alt=""
    />
  ) : (
    <Database size={size} className="shrink-0 text-muted" aria-hidden />
  );
}
