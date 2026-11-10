import { AVA, type DataSourceConfig, type Schema } from '@antv/ava';
import { WorkbenchError } from '@shared/errors';
import type { LocalDataset } from '@shared/contracts';
import type { StoredDataset } from '../db/mappers';
import { connectionFailure, type ConnectionService } from '../services/data/ConnectionService';
import { mysqlSchema } from './schema/mysql';

type LocalSource = Pick<StoredDataset, 'file' | 'semantic'> & {
  format: LocalDataset['format'];
} & Partial<Pick<StoredDataset, 'profile' | 'metrics' | 'excelSheets'>>;

export type AVADataset = StoredDataset | LocalSource;

function localSource(dataset: LocalSource): DataSourceConfig {
  const { file, format, excelSheets } = dataset;
  if (format === 'csv') return { type: 'csv-file', options: { path: file, options: { header: true } } };
  if (format === 'json') return { type: 'json-file', options: { path: file } };
  if (format === 'xlsx') return { type: 'excel', options: { path: file, sheets: excelSheets } };
  if (format === 'parquet') return { type: 'parquet', options: { path: file } };
  throw new WorkbenchError('CONNECTION', '支持 CSV、JSON、XLSX 和 Parquet');
}

export async function loadSource(ava: AVA, dataset: AVADataset, connections?: ConnectionService) {
  if (dataset.format === 'mysql') {
    if (!connections) throw new WorkbenchError('CONNECTION', 'MySQL 连接服务不可用');
    try {
      await ava.source(connections.source(dataset));
    } catch (error) {
      throw new WorkbenchError('CONNECTION', connectionFailure(error));
    }
    return;
  }
  await ava.source(localSource(dataset));
}

export async function sourceSchema(ava: AVA, dataset: AVADataset): Promise<Schema | undefined> {
  return dataset.format === 'mysql' ? mysqlSchema(ava, dataset.connection.database) : undefined;
}
