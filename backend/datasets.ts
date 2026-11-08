import { queryOptions } from './query-options';
import { WorkbenchError } from '../shared/errors';
import { fileChecksum } from './file-checksum';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Dataset, LocalDataset, BusinessMetric, MySQLInput, ExcelSheet } from '../shared/contracts';
import { businessSemantic } from './semantics';
import { Store, type StoredDataset } from './store';
import { withAVA, identifier } from './ava-service';
import { Connections, connectionFailure } from './connections';
import { inspectExcel } from './excel';
import { mysqlTableDetails } from './mysql-table-details';
export class DatasetService {
  private preparing = new Map<string, Promise<StoredDataset>>();
  // File integrity checks are operation-local; no content versions are persisted.
  private fileChecksums = new WeakMap<object, string>();
  private inspectedFiles = new Map<string, { checksum: string; updatedAt: string }>();
  constructor(
    private store: Store,
    private change: () => void,
    private isAnalyzing: () => boolean,
    private afterDelete: (id: string) => void,
    private connections?: Connections,
    private isRefreshing: () => boolean = () => false,
  ) {}
  private async inspectMySQL(input: MySQLInput) {
    if (!this.connections) throw new WorkbenchError('INVALID_INPUT', 'MySQL 连接服务不可用');
    const dataset = this.connections.prepare(input);
    try {
      const inspected = await withAVA(
        dataset,
        undefined,
        undefined,
        undefined,
        async (ava) => {
          const schema = await ava.schema();
          if (!schema.models.length) throw new WorkbenchError('INVALID_INPUT', '数据库没有可读取的表');
          const result = await ava.query(
            `SELECT * FROM ${identifier(schema.models[0].name)} LIMIT 30`,
            queryOptions,
          );
          return { schema, rows: result.data.length };
        },
        this.connections,
      );
      dataset.schema = inspected.schema;
      dataset.connection!.checkedAt = new Date().toISOString();
      return { dataset, rows: inspected.rows };
    } catch (error) {
      if (error instanceof WorkbenchError) throw error;
      throw new WorkbenchError('CONNECTION', connectionFailure(error));
    }
  }
  async testMySQL(input: MySQLInput) {
    const { dataset, rows } = await this.inspectMySQL(input);
    return { tables: dataset.schema.models.length, rows };
  }
  async saveMySQL(input: MySQLInput) {
    if (this.isAnalyzing()) throw new WorkbenchError('INVALID_INPUT', '请等待当前分析结束后修改连接');
    const original = input.id ? this.store.dataset(input.id) : undefined;
    const { dataset } = await this.inspectMySQL(input);
    if (this.isAnalyzing()) throw new WorkbenchError('INVALID_INPUT', '分析已开始，请结束后再保存连接');
    const saved = this.store.putDataset(dataset, original);
    this.change();
    return this.store.publicDataset(saved);
  }
  async refreshMySQL(id: string) {
    const dataset = this.store.dataset(id);
    if (dataset.format !== 'mysql' || !dataset.connection)
      throw new WorkbenchError('INVALID_INPUT', '请选择 MySQL 连接');
    if (this.isAnalyzing()) throw new WorkbenchError('CONFLICT', '请等待当前分析结束后刷新连接');
    try {
      await this.saveMySQL({ ...dataset.connection, id, name: dataset.name });
    } catch (error) {
      if (!(error instanceof WorkbenchError) || error.code !== 'CONNECTION') throw error;
      this.store.putDataset(
        {
          ...dataset,
          connection: {
            ...dataset.connection,
            status: 'error',
            checkedAt: new Date().toISOString(),
            error: error.message,
          },
        },
        dataset,
      );
      this.change();
      throw error;
    }
  }
  private inspect(file: string, format: LocalDataset['format'], excelSheets?: ExcelSheet[]) {
    return withAVA(
      { file, format, excelSheets, semantic: '' },
      undefined,
      undefined,
      undefined,
      async (ava) => {
        const schema = await ava.schema();
        if (excelSheets) {
          const order = excelSheets
            .filter((s) => s.header)
            .concat(excelSheets.filter((s) => !s.header))
            .map((s) => s.sheet);
          schema.models.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
        }
        const profile = await ava.profile({
          metrics: ['row_count', 'null_count', 'distinct_count', 'min', 'max', 'mean'],
        });
        if (!schema.models.length) throw new WorkbenchError('INVALID_INPUT', '未发现可分析的数据表');
        return { schema, profile };
      },
    );
  }
  async reparseData(id: string) {
    this.assertEditable();
    const original = this.store.dataset(id);
    if (original.format !== 'xlsx') throw new WorkbenchError('INVALID_INPUT', '仅 Excel 需要重新识别表头');
    const next = await this.readLocal(original.file);
    this.assertEditable();
    this.store.putDataset({ ...original, ...next.data }, original);
    this.change();
  }
  private assertEditable() {
    if (this.isAnalyzing() || this.isRefreshing())
      throw new WorkbenchError('CONFLICT', '请等待当前分析或收藏刷新结束后修改连接');
  }
  private async readLocal(file: string) {
    file = path.resolve(file);
    const format = path.extname(file).slice(1).toLowerCase() as LocalDataset['format'];
    if (!['csv', 'xlsx', 'json', 'parquet'].includes(format))
      throw new WorkbenchError('INVALID_INPUT', '请选择 CSV、XLSX、JSON 或 Parquet 文件');
    const checksum = await fileChecksum(file);
    try {
      const excelSheets = format === 'xlsx' ? inspectExcel(file) : undefined;
      const inspected = await this.inspect(file, format, excelSheets);
      await this.assertFileUnchanged({ file, format }, checksum);
      return { data: { file, format, excelSheets, ...inspected }, checksum };
    } catch (error) {
      if (error instanceof WorkbenchError) throw error;
      // Prefer an actionable missing/permission error if the file vanished during parsing.
      await fileChecksum(file);
      throw new WorkbenchError('INVALID_INPUT', '无法解析源文件，请检查文件格式和内容后重试');
    }
  }
  async assertFileUnchanged(
    source: Pick<StoredDataset, 'file' | 'format'>,
    checksum = this.fileChecksums.get(source),
  ) {
    if (source.format !== 'mysql' && (await fileChecksum(source.file)) !== checksum)
      throw new WorkbenchError(
        'CONFLICT',
        '读取期间源文件发生变化，本次结果未保存，请等待文件写入完成后重试',
      );
  }
  prepare(id: string): Promise<StoredDataset> {
    const pending = this.preparing.get(id);
    if (pending) return pending;
    const operation = this.prepareSource(id).finally(() => this.preparing.delete(id));
    this.preparing.set(id, operation);
    return operation;
  }
  private async prepareSource(id: string) {
    const original = this.store.dataset(id);
    if (original.format === 'mysql') return original;
    let checksum = await fileChecksum(original.file);
    const cached = this.inspectedFiles.get(id);
    let prepared: StoredDataset = original;
    if (checksum !== cached?.checksum || original.updatedAt !== cached.updatedAt) {
      const refreshed = await this.readLocal(original.file);
      checksum = refreshed.checksum;
      prepared = this.store.putDataset({ ...original, ...refreshed.data }, original);
      this.change();
    } else this.store.assertDatasetCurrent(original);
    this.fileChecksums.set(prepared, checksum);
    this.inspectedFiles.set(id, { checksum, updatedAt: prepared.updatedAt });
    return prepared;
  }
  async import(file: string): Promise<Dataset> {
    const inspected = await this.readLocal(file);
    const d = {
      ...inspected.data,
      id: randomUUID(),
      name: path.basename(file),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      semantic: '',
    };
    const saved = this.store.putDataset(d);
    this.inspectedFiles.set(saved.id, { checksum: inspected.checksum, updatedAt: saved.updatedAt });
    this.change();
    return this.store.publicDataset(saved);
  }
  rename(id: string, name: string) {
    this.assertEditable();
    const original = this.store.dataset(id);
    if (!name.trim()) throw new WorkbenchError('INVALID_INPUT', '请填写连接名称');
    this.store.putDataset({ ...original, name: name.trim() }, original);
    this.change();
  }
  async relocate(id: string, file: string) {
    this.assertEditable();
    const original = this.store.dataset(id);
    if (original.format === 'mysql') throw new WorkbenchError('INVALID_INPUT', '请选择本地文件连接');
    const inspected = await this.readLocal(file);
    this.assertEditable();
    this.store.putDataset({ ...original, ...inspected.data }, original);
    this.change();
  }
  deleteData(id: string) {
    if (this.isAnalyzing() || this.isRefreshing())
      throw new WorkbenchError('CONFLICT', '请先停止分析或等待收藏刷新完成后再删除数据源');
    this.store.deleteDataset(id);
    this.afterDelete(id);
    this.change();
  }
  async preview(id: string, table: string, options = { offset: 0, limit: 30 }) {
    const d = await this.prepare(id);
    const model = d.schema.models.find((m) => m.name === table);
    if (!model) throw new WorkbenchError('INVALID_INPUT', '数据表不存在');
    const { offset, limit } = options;
    if (offset < 0 || !Number.isSafeInteger(offset + limit) || limit < 1 || limit > 201)
      throw new WorkbenchError('INVALID_INPUT', '无效的预览分页参数');
    const keys = typeof model.primaryKey === 'string' ? [model.primaryKey] : model.primaryKey || [];
    const order = keys.length ? ` ORDER BY ${keys.map(identifier).join(', ')}` : '';
    return withAVA(
      d,
      undefined,
      undefined,
      undefined,
      async (ava) => {
        const result = await ava.query(
          `SELECT * FROM ${identifier(table)}${order} LIMIT ${limit} OFFSET ${offset}`,
          queryOptions,
        );
        await this.assertFileUnchanged(d);
        this.store.assertDatasetCurrent(d);
        return result.data;
      },
      this.connections,
    );
  }
  async tableDetails(id: string, table: string) {
    const dataset = this.store.dataset(id);
    if (dataset.format !== 'mysql' || !dataset.connection)
      throw new WorkbenchError('INVALID_INPUT', '请选择 MySQL 数据表');
    if (!dataset.schema.models.some((model) => model.name === table))
      throw new WorkbenchError('INVALID_INPUT', '数据表不存在');
    try {
      const source = this.connections?.source(dataset);
      if (source?.type !== 'mysql') throw new WorkbenchError('INVALID_INPUT', 'MySQL 连接服务不可用');
      return await mysqlTableDetails({ ...dataset.connection, password: source.options.password }, table);
    } catch {
      throw new WorkbenchError('INVALID_INPUT', '无法读取索引和建表语句，请检查连接及表结构查看权限后重试');
    }
  }
  async semantic(id: string, text: string, inputMetrics?: BusinessMetric[]) {
    this.assertEditable();
    const d = await this.prepare(id);
    const metrics = inputMetrics ?? d.metrics ?? [];
    const names = new Set<string>();
    for (const metric of metrics) {
      if (!metric.name.trim() || !metric.expression.trim())
        throw new WorkbenchError('INVALID_INPUT', '请填写指标名称与计算公式');
      if (!d.schema.models.some((model) => model.name === metric.table))
        throw new WorkbenchError('INVALID_INPUT', `指标「${metric.name}」需选择当前数据中的表`);
      const key = JSON.stringify([metric.table, metric.name.trim()]);
      if (names.has(key)) throw new WorkbenchError('INVALID_INPUT', '同一张表的指标名称不能重复');
      names.add(key);
    }
    await withAVA(
      d,
      undefined,
      undefined,
      undefined,
      async (ava) => {
        for (const metric of metrics) {
          try {
            const result = await ava.query(
              `SELECT (${metric.expression}) AS metric_value FROM ${identifier(metric.table)} WHERE FALSE`,
              queryOptions,
            );
            if (result.data.length !== 1)
              throw new WorkbenchError('INVALID_INPUT', '请使用 SUM、AVG、COUNT 等聚合公式');
          } catch (error) {
            throw new WorkbenchError(
              'INVALID_INPUT',
              `指标「${metric.name}」公式校验失败：${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
        await ava.semantic({}, () => businessSemantic(text, metrics));
      },
      this.connections,
    );
    this.assertEditable();
    await this.assertFileUnchanged(d);
    this.assertEditable();
    this.store.putDataset(
      {
        ...d,
        semantic: text,
        metrics: metrics.map((metric) => ({ ...metric, name: metric.name.trim() })),
      },
      d,
    );
    this.change();
  }
}
