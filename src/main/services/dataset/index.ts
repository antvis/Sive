import { randomUUID } from 'node:crypto';
import { statSync } from 'node:fs';
import path from 'node:path';
import { AVA } from '@antv/ava';
import type { DataSourceConfig, Semantic } from '@antv/ava';
import type { Repositories } from '../../db/repository';
import type { DBConnection } from '../../db/repository/db-connection';
import type { datasets } from '../../db/schema/datasets';
import { required } from '../../util';
import type { DatasetSaveInput } from '../types';

type DatasetRow = typeof datasets.$inferSelect;

function toSummary(row: DatasetRow) {
  let fileSize: number | undefined;
  if (row.sourceConfig.type === 'csv-file') {
    try {
      fileSize = statSync(row.sourceConfig.options.path).size;
    } catch {
      fileSize = undefined;
    }
  }
  const rowCount = row.profile.models[0]?.metrics.row_count;
  return {
    id: row.id,
    name: row.name,
    sourceType: row.sourceType,
    updatedAt: row.updatedAt,
    fileSize,
    rowCount: typeof rowCount === 'number' ? rowCount : undefined,
    columnCount: row.schema.models[0]?.columns.length ?? 0,
  };
}

export class DatasetService {
  constructor(
    private database: DBConnection,
    private repositories: Repositories,
  ) {}

  list() {
    return this.repositories.datasets.list();
  }

  listSummaries() {
    return this.list().map(toSummary);
  }

  get(id: string) {
    return this.repositories.datasets.get(id);
  }

  getSummary(id: string) {
    const row = this.get(id);
    return row ? toSummary(row) : undefined;
  }

  async importCsv(filePath: string) {
    const sourceConfig: DataSourceConfig = { type: 'csv-file', options: { path: filePath } };
    const ava = new AVA({ llm: { model: 'data-loading-only' } });
    try {
      await ava.source(sourceConfig);
      const schema = await ava.schema();
      const profile = await ava.profile();
      return this.save({
        name: path.basename(filePath, path.extname(filePath)),
        sourceConfig,
        schema,
        profile,
      });
    } finally {
      await ava.dispose();
    }
  }

  save(input: DatasetSaveInput) {
    const now = new Date().toISOString();
    const values = {
      name: input.name.trim(),
      sourceType: input.sourceConfig.type,
      sourceConfig: input.sourceConfig,
      schema: input.schema,
      profile: input.profile,
      semantic: input.semantic ?? {},
      metrics: input.metrics,
      updatedAt: now,
    };
    return this.database.write(() => {
      if (input.id) {
        required(this.repositories.datasets.get(input.id), '数据源不存在或已删除。');
        return required(this.repositories.datasets.update(input.id, values), '数据源保存失败。');
      }
      return this.repositories.datasets.insert({ ...values, id: randomUUID(), createdAt: now });
    });
  }

  rename(id: string, name: string) {
    this.database.write(() => {
      required(this.repositories.datasets.get(id), '数据源不存在或已删除。');
      this.repositories.datasets.update(id, { name: name.trim() });
    });
  }

  remove(id: string) {
    this.database.write(() => this.repositories.datasets.remove(id));
  }

  saveSemantic(id: string, semantic: Semantic, metrics?: unknown) {
    this.database.write(() => {
      required(this.repositories.datasets.get(id), '数据源不存在或已删除。');
      this.repositories.datasets.update(id, { semantic, metrics });
    });
  }
}
