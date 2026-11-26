import { DatabaseIcon } from 'lucide-react';
import { findDatasetSource } from '@shared/dataSource';

export function DataSourceLogo({ type, size }: { type: string; size: number }) {
  const source = findDatasetSource(type);
  return source ? (
    <img
      src={source.logo}
      width={size}
      height={size}
      className="shrink-0 object-contain"
      alt=""
    />
  ) : (
    <DatabaseIcon size={size} className="shrink-0 text-muted-foreground" aria-hidden />
  );
}
