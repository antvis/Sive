import { randomUUID } from 'node:crypto';
import { statSync } from 'node:fs';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { AVA } from '@antv/ava';
import type { DataSourceConfig, Semantic } from '@antv/ava';
import type { Repositories } from '../../db/repository';
import type { DBConnection } from '../../db/repository/db-connection';
import type { datasets } from '../../db/schema/datasets';
import { required } from '../../util';
import { DEFAULT_PREVIEW_PAGE_SIZE, PREVIEW_PAGE_SIZES } from '@shared/api';
import type { DatasetPreviewOptions } from '@shared/api';
import { checkLocalFile, localFilePath } from '../../util/localFile';
import { sourceEngine } from '../../util/engine';

type DatasetRow = typeof datasets.$inferSelect;

function toSummary(row: DatasetRow) {
  let fileSize: number | undefined;
  const filePath = localFilePath(row.sourceConfig);
  let fileUnavailable = false;
  if (filePath) {
    try {
      fileSize = statSync(filePath).size;
    } catch {
      fileUnavailable = true;
    }
  }
  const rowCount = row.profile.models.find((model) => model.name === row.schema.models[0]?.name)?.metrics
    .row_count;
  return {
    id: row.id,
    name: row.name,
    sourceType: row.sourceType,
    updatedAt: row.updatedAt,
    fileSize,
    localFile: Boolean(filePath),
    fileUnavailable,
    tableCount: row.schema.models.length,
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

  getDetail(id: string) {
    const row = this.get(id);
    if (!row) return null;
    let sourceConfig = row.sourceConfig;
    switch (sourceConfig.type) {
      case 'mysql':
      case 'postgresql': {
        const { host, port, database, user } = sourceConfig.options;
        sourceConfig = {
          type: sourceConfig.type,
          options: {
            host,
            port,
            database,
            user,
            ...(sourceConfig.type === 'postgresql' ? { schema: sourceConfig.options.schema } : {}),
          },
        };
        break;
      }
      case 'mongodb': {
        const { host, port, database, user, authSource, tls, ssl } = sourceConfig.options;
        sourceConfig = {
          type: 'mongodb',
          options: { host, port, database, user, authSource, tls: tls || ssl },
        };
        break;
      }
      case 'clickhouse': {
        const { url, database, username } = sourceConfig.options;
        const address = new URL(required(url, 'ClickHouse 连接地址缺失。'));
        address.username = '';
        address.password = '';
        address.search = '';
        address.hash = '';
        sourceConfig = {
          type: 'clickhouse',
          options: { url: address.toString(), database, username },
        };
        break;
      }
    }
    return {
      ...toSummary(row),
      sourceConfig,
      schema: row.schema,
      profile: row.profile,
      semantic: row.semantic,
    };
  }

  async refresh(id: string) {
    const original = required(this.get(id), '数据源不存在或已删除。');
    const refreshed = await this.readSource(original.sourceConfig);
    return this.database.write(() =>
      required(this.repositories.datasets.update(id, refreshed), '数据源不存在或已删除。'),
    );
  }

  async test(sourceConfig: DataSourceConfig) {
    await this.readSource(sourceConfig);
  }

  async preview(
    id: string,
    table?: string,
    options: DatasetPreviewOptions = { offset: 0, limit: DEFAULT_PREVIEW_PAGE_SIZE },
  ) {
    const dataset = required(this.get(id), '数据源不存在或已删除。');
    const model = required(
      table === undefined
        ? dataset.schema.models[0]
        : dataset.schema.models.find((item) => item.name === table),
      '数据表不存在。',
    );
    const { offset, limit } = options;
    if (
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      !PREVIEW_PAGE_SIZES.some((size) => size === limit) ||
      !Number.isSafeInteger(offset + limit + 1)
    )
      throw new Error('无效的预览分页参数。');

    const identifier = (name: string) => `"${name.replace(/"/g, '""')}"`;
    const keys = typeof model.primaryKey === 'string' ? [model.primaryKey] : (model.primaryKey ?? []);
    const order = keys.length ? ` ORDER BY ${keys.map(identifier).join(', ')}` : '';
    const ava = new AVA({
      llm: { model: 'preview-only' },
      engine: sourceEngine(dataset.sourceConfig, { type: 'duckdb', queryTimeoutMs: 30000 }),
    });
    try {
      const file = localFilePath(dataset.sourceConfig);
      if (file) await checkLocalFile(file);
      await ava.source(dataset.sourceConfig);
      const result = await ava.query(
        `SELECT * FROM ${identifier(model.name)}${order} LIMIT ${limit + 1} OFFSET ${offset}`,
        { maxRows: limit + 1 },
      );
      return result.data;
    } finally {
      await ava.dispose();
    }
  }

  async suggest(id: string, config: { baseURL: string; model: string; apiKey?: string }) {
    const dataset = required(this.get(id), '数据源不存在或已删除。');
    const provider = createOpenAICompatible({ name: 'sive', baseURL: config.baseURL, apiKey: config.apiKey });
    const ava = new AVA({
      llm: { model: provider.chatModel(config.model) },
      engine: sourceEngine(dataset.sourceConfig, { type: 'duckdb', memoryLimit: '1024MB' }),
    });
    try {
      const file = localFilePath(dataset.sourceConfig);
      if (file) await checkLocalFile(file);
      await ava.source(dataset.sourceConfig);
      await ava.schema({}, () => dataset.schema);
      await ava.profile({}, () => dataset.profile);
      await ava.semantic({}, () => dataset.semantic);
      return await ava.suggest(3);
    } finally {
      await ava.dispose();
    }
  }

  private async readSource(sourceConfig: DataSourceConfig) {
    const file = localFilePath(sourceConfig);
    if (file) await checkLocalFile(file);
    const ava = new AVA({
      llm: { model: 'data-loading-only' },
      engine: sourceEngine(sourceConfig, { type: 'duckdb', memoryLimit: '1024MB' }),
    });
    try {
      await ava.source(sourceConfig);
      const schema = await ava.schema();
      const profile = await ava.profile({ metrics: ['row_count'] });
      if (!schema.models.length) throw new Error('未发现可读取的数据表。');
      return {
        sourceConfig,
        schema,
        profile,
      };
    } finally {
      await ava.dispose();
    }
  }

  async save(name: string, sourceConfig: DataSourceConfig, id?: string) {
    const inspected = await this.readSource(sourceConfig);
    const now = new Date().toISOString();
    const values = {
      ...inspected,
      name: name.trim(),
      sourceType: sourceConfig.type,
      updatedAt: now,
    };
    return this.database.write(() => {
      if (id) return required(this.repositories.datasets.update(id, values), '数据源不存在或已删除。');
      return this.repositories.datasets.insert({
        ...values,
        id: randomUUID(),
        semantic: {},
        createdAt: now,
      });
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
