import { and, desc, eq, isNull } from 'drizzle-orm';
import { datasets } from '@main/data/db/schema';
import type { Dataset } from '@shared/contracts';
import { WorkbenchError } from '@shared/errors';
import {
  parseJSON,
  sourceSnapshot,
  type DatasetRow,
  type SourceConfig,
  type StoredDataset,
} from '@main/data/mappers';
import type { DbService } from '@main/data/db/DbService';
import { conflict, timestamp } from './utils';

export class DatasetService {
  constructor(private database: DbService) {}
  private get db() {
    return this.database.connection;
  }
  private datasetRecord(row: DatasetRow): StoredDataset {
    const source = parseJSON<SourceConfig>(row.source_config);
    const fields = {
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at ?? undefined,
      schema: parseJSON<Dataset['schema']>(row.schema),
      profile: parseJSON<Dataset['profile']>(row.profile),
      semantic: row.semantic,
      metrics: row.metrics ? parseJSON<Dataset['metrics']>(row.metrics) : undefined,
    };
    if (row.source_type === 'mysql') {
      // Deleted sources retain their display identity after their connection config is cleared.
      const connection = source.connection ?? {
        host: '',
        port: 3306,
        database: '',
        user: '',
        status: 'error' as const,
        hasPassword: false,
      };
      return {
        ...fields,
        format: 'mysql',
        file: '',
        connection: { ...connection, hasPassword: !!row.encrypted_credentials },
        encryptedCredentials: row.encrypted_credentials ?? undefined,
      };
    }
    if (!['csv', 'json', 'xlsx', 'parquet'].includes(row.source_type))
      throw new WorkbenchError('CONNECTION', `当前应用尚不支持此数据源类型：${row.source_type}`);
    return {
      ...fields,
      format: row.source_type as 'csv' | 'json' | 'xlsx' | 'parquet',
      file: source.path || '',
      excelSheets: source.excelSheets,
    };
  }
  publicDataset(dataset: StoredDataset): Dataset {
    const { file, encryptedCredentials, ...result } = dataset;
    return result;
  }
  dataset(id: string) {
    const row = this.db.select().from(datasets).where(eq(datasets.id, id)).get();
    if (!row) return conflict('数据不存在');
    if (row.deleted_at) return conflict('连接已删除，历史分析仍可查看和导出');
    return this.datasetRecord(row);
  }
  assertDatasetCurrent(expected: StoredDataset) {
    const current = this.db
      .select({ updated_at: datasets.updated_at })
      .from(datasets)
      .where(and(eq(datasets.id, expected.id), isNull(datasets.deleted_at)))
      .get();
    if (current?.updated_at !== expected.updatedAt) conflict('数据已被其他操作修改，请重新打开后重试');
  }
  putDataset(next: StoredDataset, expected?: StoredDataset) {
    return this.database.write(() => {
      if (expected) this.assertDatasetCurrent(expected);
      else if (this.db.select({ id: datasets.id }).from(datasets).where(eq(datasets.id, next.id)).get())
        conflict('数据源已存在');
      if (!next.deletedAt && next.format !== 'mysql' && !next.file.trim()) conflict('请选择源文件');
      if (!next.deletedAt && next.format === 'xlsx' && !next.excelSheets) conflict('缺少 Excel 读取区域');
      const now = timestamp(expected?.updatedAt);
      const values = {
        name: next.name,
        source_type: next.format,
        source_config: JSON.stringify(next.deletedAt ? {} : sourceSnapshot(next).config),
        schema: JSON.stringify(next.schema),
        profile: JSON.stringify(next.profile),
        semantic: next.semantic,
        metrics: next.metrics ? JSON.stringify(next.metrics) : null,
        encrypted_credentials: next.deletedAt ? null : (next.encryptedCredentials ?? null),
        updated_at: now,
        deleted_at: next.deletedAt ?? null,
      };
      const row = this.db
        .insert(datasets)
        .values({ id: next.id, created_at: expected?.createdAt ?? now, ...values })
        .onConflictDoUpdate({ target: datasets.id, set: values })
        .returning()
        .get();
      return this.datasetRecord(row);
    });
  }
  deleteDataset(id: string) {
    const original = this.dataset(id);
    this.putDataset(
      { ...original, file: '', encryptedCredentials: undefined, deletedAt: timestamp() },
      original,
    );
  }
  list() {
    return this.db
      .select()
      .from(datasets)
      .orderBy(desc(datasets.updated_at), desc(datasets.id))
      .all()
      .map((row) => this.publicDataset(this.datasetRecord(row)));
  }
}
