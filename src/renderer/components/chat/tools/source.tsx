import { findDatasetSource } from '@shared/dataSource';
import { formatMetric } from '../../../utils';
import { DataSourceLogo } from '../../DataSourceLogo';

export type SourceResult = {
  name: string;
  sourceType: string;
  rowCount?: unknown;
  columnCount: number;
  fileSize?: number;
};

function formatFileSize(value?: number) {
  if (value === undefined) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function SourceTool({ source }: { source: SourceResult }) {
  const stats = [
    { label: '文件大小', value: formatFileSize(source.fileSize) },
    {
      label: '行数',
      value: typeof source.rowCount === 'number' ? formatMetric(source.rowCount) : '—',
    },
    { label: '列数', value: formatMetric(source.columnCount) },
  ];
  return (
    <div className="rounded-lg bg-muted/50 p-4">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-background">
          <DataSourceLogo type={source.sourceType} size={18} />
        </span>
        <span className="min-w-0 break-words text-base font-medium text-foreground">{source.name}</span>
        <span className="shrink-0 text-sm text-muted-foreground">
          {findDatasetSource(source.sourceType)?.label ?? source.sourceType}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-baseline gap-1.5 text-sm">
            <span className="text-muted-foreground">{stat.label}</span>
            <span className="text-foreground/80">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
