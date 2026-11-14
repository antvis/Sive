import { randomUUID } from 'node:crypto';
import { statSync } from 'node:fs';
import path from 'node:path';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { AVA } from '@antv/ava';
import type { DataSourceConfig, Semantic } from '@antv/ava';
import type { Repositories } from '../../db/repository';
import type { DBConnection } from '../../db/repository/db-connection';
import type { datasets } from '../../db/schema/datasets';
import { required } from '../../util';
import type { DatasetSaveInput } from '../types';
import { DEFAULT_PREFERENCES, PREVIEW_PAGE_SIZES } from '@shared/api';
import type { DatasetPreviewOptions } from '@shared/api';
import { checkLocalFile, localFilePath, localSource } from '../../util/localFile';
import { mysqlInputSchema } from '@shared/mysql';
import type { MySQLConnection } from '@shared/mysql';

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
    private withSourceUpdate: (id: string, update: () => Promise<DatasetRow>) => Promise<DatasetRow>,
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

  getDetail(id: string) {
    const row = this.get(id);
    return row ? { ...toSummary(row), schema: row.schema, semantic: row.semantic } : null;
  }

  getLocalFile(id: string) {
    const row = required(this.get(id), '数据源不存在或已删除。');
    return required(localFilePath(row.sourceConfig), '只有本地文件支持刷新或重新定位。');
  }

  refresh(id: string) {
    return this.withSourceUpdate(id, () => this.replaceSource(id));
  }

  relocate(id: string, file: string) {
    return this.withSourceUpdate(id, () => this.replaceSource(id, file));
  }

  private async replaceSource(id: string, file?: string) {
    const original = required(this.get(id), '数据源不存在或已删除。');
    let sourceConfig = structuredClone(original.sourceConfig);
    if (file !== undefined) {
      required(localFilePath(sourceConfig), '只有本地文件支持重新定位。');
      const next = localSource(file);
      if (next.type === sourceConfig.type && 'path' in sourceConfig.options)
        sourceConfig.options.path = path.resolve(file);
      else sourceConfig = next;
    }
    const refreshed = await this.readSource(sourceConfig);
    return this.database.write(() => {
      required(this.get(id), '数据源不存在或已删除。');
      return required(
        this.repositories.datasets.update(id, {
          ...refreshed,
          sourceType: refreshed.sourceConfig.type,
        }),
        '数据源保存失败。',
      );
    });
  }

  private mysqlSource(id: string) {
    const row = required(this.get(id), '数据源不存在或已删除。');
    if (row.sourceConfig.type !== 'mysql') throw new Error('只有 MySQL 数据源支持此操作。');
    return row.sourceConfig;
  }

  getMySQL(id: string): MySQLConnection {
    const row = required(this.get(id), '数据源不存在或已删除。');
    const { host, port = 3306, database, user = '', password } = this.mysqlSource(id).options;
    return { id, name: row.name, host, port, database, user, hasPassword: Boolean(password) };
  }

  private prepareMySQL(input: unknown) {
    const parsed = mysqlInputSchema.safeParse(input);
    if (!parsed.success) throw new Error(parsed.error.issues[0].message);
    const { id, name, password, ...connection } = parsed.data;
    const previous = id ? this.mysqlSource(id) : undefined;
    const sourceConfig: Extract<DataSourceConfig, { type: 'mysql' }> = {
      type: 'mysql',
      options: { ...connection, password: password ?? previous?.options.password ?? '' },
    };
    return { id, name, sourceConfig };
  }

  async testMySQL(input: unknown) {
    await this.readSource(this.prepareMySQL(input).sourceConfig);
  }

  async saveMySQL(input: unknown) {
    const { id, name, sourceConfig } = this.prepareMySQL(input);

    const save = async () => {
      const inspected = await this.readSource(sourceConfig);
      if (!id) return this.save({ ...inspected, name });
      return this.database.write(() =>
        required(
          this.repositories.datasets.update(id, { ...inspected, name, sourceType: 'mysql' }),
          '数据源不存在或已删除。',
        ),
      );
    };
    if (id) await this.withSourceUpdate(id, save);
    else await save();
  }

  async preview(
    id: string,
    table?: string,
    options: DatasetPreviewOptions = { offset: 0, limit: DEFAULT_PREFERENCES.previewPageSize },
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
      engine: { type: 'duckdb', queryTimeoutMs: 30000 },
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
      engine: {
        type: 'duckdb',
        memoryLimit: '1024MB',
      },
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

  async importLocal(filePath: string) {
    const inspected = await this.readSource(localSource(filePath));
    return this.save({ ...inspected, name: path.basename(filePath, path.extname(filePath)) });
  }

  private async readSource(sourceConfig: DataSourceConfig) {
    const file = localFilePath(sourceConfig);
    if (file) await checkLocalFile(file);
    const ava = new AVA({
      llm: { model: 'data-loading-only' },
      engine: {
        type: 'duckdb',
        memoryLimit: '1024MB',
      },
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
