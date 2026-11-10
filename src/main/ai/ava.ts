import { WorkbenchError } from '@shared/errors';
import { AVA, type DataSourceConfig } from '@antv/ava';
import type { StoredDataset } from '@main/db/mappers';
import type { Progress, ExcelSheet } from '@shared/contracts';
import type { ModelService } from '@main/services/settings/ModelService';
import { analysisProgress, PROGRESS_LABELS } from '@main/ai/progress';
import { businessSemantic } from '@main/ai/semantics';
import type { ConnectionService } from '@main/services/data/ConnectionService';
import { connectionFailure } from '@main/services/data/ConnectionService';
import type { StoredModel } from '@main/db/mappers';
import { mysqlSchema } from '@main/services/data/mysqlSchema';
import type { LanguageModel } from 'ai';
import path from 'node:path';
import { profileSummary, schemaSummary } from './metadataSummary';
function source(file: string, format: string, sheets?: ExcelSheet[]): DataSourceConfig {
  if (format === 'csv') return { type: 'csv-file', options: { path: file, options: { header: true } } };
  if (format === 'json') return { type: 'json-file', options: { path: file } };
  if (format === 'xlsx') return { type: 'excel', options: { path: file, sheets } };
  if (format === 'parquet') return { type: 'parquet', options: { path: file } };
  throw new WorkbenchError('CONNECTION', '支持 CSV、JSON、XLSX 和 Parquet');
}
export async function withAVA<T>(
  dataset:
    | (Pick<StoredDataset, 'file' | 'format' | 'semantic'> &
        Partial<Pick<StoredDataset, 'profile' | 'metrics' | 'excelSheets' | 'connection' | 'credentials'>>)
    | undefined,
  models: ModelService | undefined,
  signal: AbortSignal | undefined,
  progress: ((p: Progress) => void) | undefined,
  fn: (ava: AVA, model?: LanguageModel) => Promise<T>,
  connections?: ConnectionService,
  model?: StoredModel,
): Promise<T> {
  const languageModel = models?.model(model || models.active(), signal, progress);
  const ava = new AVA({
    llm: {
      model: languageModel || 'not-configured',
      maxRetries: 0,
    },
    engine: {
      type: 'duckdb',
      memoryLimit: '512MB',
      threads: 2,
      queryTimeoutMs: 30000,
    },
  });
  const started = new Map<string, number>();
  let preparingSchema = false;
  let schemaProgress: Progress | undefined;
  for (const event of Object.keys(PROGRESS_LABELS))
    ava.on(event, (payload: { data?: Record<string, unknown> | null }) => {
      const p = analysisProgress(event, payload.data);
      const stage = event.replace(/(start|end)$/, '');
      if (event.endsWith('start')) started.set(stage, Date.now());
      if (event.endsWith('end') && started.has(stage)) {
        p.durationMs = Date.now() - started.get(stage)!;
        started.delete(stage);
      }
      if (dataset?.format === 'mysql' && p.error && ['sourceend', 'schemaend'].includes(event))
        p.detail = connectionFailure(payload.data?.error);
      if (event === 'sourceend' && dataset && !p.error)
        p.detail =
          dataset.format === 'mysql'
            ? `已连接数据库 ${dataset.connection!.database}；按需查询数据。`
            : `已读取 ${path.basename(dataset.file)}（${dataset.format.toUpperCase()}）`;
      if (event === 'schemaend' && preparingSchema && !p.error) {
        // AVA omits metadata from this event; publish it with the returned schema below.
        schemaProgress = p;
        return;
      }
      if (event === 'profileend' && dataset?.profile && !p.error) {
        p.label = dataset.format === 'mysql' ? '已采用表结构上下文' : '已恢复当前数据画像';
        p.detail =
          dataset.format === 'mysql'
            ? '未全库扫描；行数和统计指标将在实际查询中计算。'
            : `采用已保存的统计信息：\n${profileSummary(dataset.profile)}`;
      }
      if (event === 'semanticend' && dataset && !p.error)
        p.detail = businessSemantic(dataset.semantic, dataset.metrics).description?.slice(0, 3000);
      progress?.(p);
    });
  let operationFailed = false;
  try {
    signal?.throwIfAborted();
    if (dataset) {
      if (dataset.format === 'mysql') {
        if (!connections) throw new WorkbenchError('CONNECTION', 'MySQL 连接服务不可用');
        try {
          await ava.source(connections.source(dataset as StoredDataset));
        } catch (error) {
          throw new WorkbenchError('CONNECTION', connectionFailure(error));
        }
      } else await ava.source(source(dataset.file, dataset.format, dataset.excelSheets));
      signal?.throwIfAborted();
      const connectionSchema =
        dataset.format === 'mysql' ? await mysqlSchema(ava, dataset.connection!.database) : undefined;
      signal?.throwIfAborted();
      preparingSchema = true;
      const schema = connectionSchema ? await ava.schema({}, () => connectionSchema) : await ava.schema();
      preparingSchema = false;
      if (schemaProgress) progress?.({ ...schemaProgress, detail: schemaSummary(schema) });
      signal?.throwIfAborted();
      // Each operation has its own AVA instance; restore the saved profile so
      // both analysis modes and suggestions receive the saved observations.
      if (dataset.profile) await ava.profile({}, () => dataset.profile!);
      signal?.throwIfAborted();
      if (dataset.semantic || dataset.metrics?.length)
        await ava.semantic({}, () => businessSemantic(dataset.semantic, dataset.metrics));
    }
    signal?.throwIfAborted();
    return await fn(ava, languageModel);
  } catch (error) {
    operationFailed = true;
    throw error;
  } finally {
    try {
      await ava.dispose();
    } catch (error) {
      if (!operationFailed) throw error;
    }
  }
}
export function identifier(s: string) {
  return '"' + s.replaceAll('"', '""') + '"';
}
