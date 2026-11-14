import { Database, FileCode, FileCsv, Stack, Table } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

type DatasetSource = { label: string; icon: Icon };

const sources = new Map<string, DatasetSource>([
  ['csv-file', { label: 'CSV', icon: FileCsv }],
  ['json-file', { label: 'JSON', icon: FileCode }],
  ['excel', { label: 'Excel', icon: Table }],
  ['parquet', { label: 'Parquet', icon: Stack }],
]);

export function getDatasetSource(type: string): DatasetSource {
  return sources.get(type) ?? { label: type, icon: Database };
}
