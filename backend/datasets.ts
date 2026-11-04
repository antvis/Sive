import { queryOptions } from './query-options';
import { WorkbenchError } from '../shared/errors';
import fs from 'node:fs/promises';
import { copySource, fingerprintFile } from './local-files';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  Dataset,
  LocalDataset,
  Task,
  BusinessMetric,
  MySQLInput,
  ExcelSheet,
} from '../shared/contracts';
import { businessSemantic } from './semantics';
import { Store } from './store';
import { withAVA, identifier } from './ava-service';
import { Connections, connectionFailure } from './connections';
import { inspectExcel } from './excel';
import { mysqlTableDetails } from './mysql-table-details';
export class DatasetService {
  constructor(
    private store: Store,
    private change: () => void,
    private currentTask: () => Task | null,
    private afterDelete: (id: string) => void,
    private connections?: Connections,
  ) {}
  private get busy() {
    const task = this.currentTask();
    return task?.status === 'running' || task?.status === 'cancelling';
  }
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
          return { schema, preview: result.data };
        },
        this.connections,
      );
      Object.assign(dataset, inspected);
      dataset.connection!.checkedAt = new Date().toISOString();
      return dataset;
    } catch (error) {
      if (error instanceof WorkbenchError) throw error;
      throw new WorkbenchError('CONNECTION', connectionFailure(error));
    }
  }
  async testMySQL(input: MySQLInput) {
    const dataset = await this.inspectMySQL(input);
    return { tables: dataset.schema.models.length, rows: dataset.preview.length };
  }
  async saveMySQL(input: MySQLInput) {
    if (this.busy) throw new WorkbenchError('INVALID_INPUT', '请等待当前分析结束后修改连接');
    const original = input.id ? this.store.dataset(input.id) : undefined;
    const dataset = await this.inspectMySQL(input);
    if (this.busy) throw new WorkbenchError('INVALID_INPUT', '分析已开始，请结束后再保存连接');
    this.store.putDataset(dataset, original);
    this.change();
    return this.store.publicState(this.currentTask()).datasets.find((d) => d.id === dataset.id)!;
  }
  async refreshMySQL(id: string) {
    const dataset = this.store.dataset(id);
    if (dataset.format !== 'mysql' || !dataset.connection)
      throw new WorkbenchError('INVALID_INPUT', '请选择 MySQL 连接');
    if (this.busy) throw new WorkbenchError('CONFLICT', '请等待当前分析结束后刷新连接');
    try {
      await this.saveMySQL({ ...dataset.connection, id, name: dataset.name });
    } catch (error) {
      if (!(error instanceof WorkbenchError) || error.code !== 'CONNECTION') throw error;
      dataset.connection.status = 'error';
      dataset.connection.checkedAt = new Date().toISOString();
      dataset.connection.error = error.message;
      this.store.putDataset(dataset, dataset);
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
        const preview = await ava.query(
          `SELECT * FROM ${identifier(schema.models[0].name)} LIMIT 30`,
          queryOptions,
        );
        return { schema, profile, preview: preview.data };
      },
    );
  }
  async reparseData(id: string) {
    if (this.busy) throw new WorkbenchError('INVALID_INPUT', '请等待当前分析结束后再重新识别');
    const original = this.store.dataset(id);
    if (original.format !== 'xlsx') throw new WorkbenchError('INVALID_INPUT', '仅 Excel 需要重新识别表头');
    if ((await fingerprintFile(original.file)) !== original.fingerprint)
      throw new WorkbenchError('INVALID_INPUT', '数据副本已变化，请重新导入');
    const excelSheets = inspectExcel(original.file);
    const inspected = await this.inspect(original.file, original.format, excelSheets);
    if (this.busy) throw new WorkbenchError('INVALID_INPUT', '数据正在使用或已变化，请稍后重试');
    this.store.assertDatasetCurrent(original);
    const next = { ...original, ...inspected, excelSheets };
    this.store.putDataset(next, original);
    this.change();
  }
  async import(file: string): Promise<Dataset> {
    const format = path.extname(file).slice(1).toLowerCase() as LocalDataset['format'];
    if (!['csv', 'xlsx', 'json', 'parquet'].includes(format))
      throw new WorkbenchError('INVALID_INPUT', '请选择 CSV、XLSX、JSON 或 Parquet 文件');
    const id = randomUUID(),
      dest = path.join(this.store.root, 'sources', id + '.' + format);
    await copySource(file, dest);
    try {
      const excelSheets = format === 'xlsx' ? inspectExcel(dest) : undefined;
      const inspected = await this.inspect(dest, format, excelSheets);
      const d = {
        id,
        file: dest,
        name: path.basename(file),
        format,
        fingerprint: await fingerprintFile(dest),
        createdAt: new Date().toISOString(),
        semantic: '',
        excelSheets,
        ...inspected,
      };
      this.store.putDataset(d);
      this.change();
      const { file: _, ...publicData } = d;
      return publicData;
    } catch (error) {
      await fs.rm(dest, { force: true });
      throw error;
    }
  }
  deleteData(id: string) {
    if (this.busy && this.currentTask()?.datasetId === id)
      throw new WorkbenchError('INVALID_INPUT', '此数据正在分析，请等待分析结束后再删除');
    this.store.deleteDataset(id);
    this.afterDelete(id);
    this.change();
  }
  async preview(id: string, table: string, options = { offset: 0, limit: 30 }) {
    const d = this.store.dataset(id);
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
    const d = this.store.dataset(id);
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
