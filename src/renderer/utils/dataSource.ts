import { Database, FileCode, FileCsv, Stack, Table } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

type DatasetSource = { label: string; icon: Icon; refreshable?: boolean };

const sources = new Map<string, DatasetSource>([
  ['csv-file', { label: 'CSV', icon: FileCsv, refreshable: true }],
  ['json-file', { label: 'JSON', icon: FileCode, refreshable: true }],
  ['excel', { label: 'Excel', icon: Table, refreshable: true }],
  ['parquet', { label: 'Parquet', icon: Stack, refreshable: true }],
  ['mysql', { label: 'MySQL', icon: Database, refreshable: true }],
]);

export function getDatasetSource(type: string): DatasetSource {
  return sources.get(type) ?? { label: type, icon: Database };
}
