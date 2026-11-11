import { randomUUID } from 'node:crypto';
import type { Semantic } from '@antv/ava';
import type { Repositories } from '../../db/repository';
import type { DBConnection } from '../../db/repository/db-connection';
import type { DatasetSaveInput } from '../types';
import { required } from '../../util';

export class DatasetService {
  constructor(
    private database: DBConnection,
    private repositories: Repositories,
  ) {}

  list() {
    return this.repositories.datasets.list();
  }

  get(id: string) {
    return this.repositories.datasets.get(id);
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
