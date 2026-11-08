import { WorkbenchError } from '@shared/errors';
import { AVA, type DataSourceConfig } from '@antv/ava';
import type { StoredDataset } from '@main/data/mappers';
import type { Progress, ExcelSheet } from '@shared/contracts';
import type { ModelService } from '@main/services/settings/ModelService';
import { analysisProgress, progressLabels } from '@main/ai/progress';
import { businessSemantic } from '@main/ai/semantics';
import type { ConnectionService } from '@main/services/data/ConnectionService';
import { connectionFailure } from '@main/services/data/ConnectionService';
import type { StoredModel } from '@main/data/mappers';
import { mysqlSchema } from '@main/services/data/mysqlSchema';
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
        Partial<
          Pick<StoredDataset, 'profile' | 'metrics' | 'excelSheets' | 'connection' | 'encryptedCredentials'>
        >)
    | undefined,
  models: ModelService | undefined,
  signal: AbortSignal | undefined,
  progress: ((p: Progress) => void) | undefined,
  fn: (ava: AVA) => Promise<T>,
  connections?: ConnectionService,
  model?: StoredModel,
): Promise<T> {
  let visualizing = false;
  let chartSelection: string | undefined;
  const ava = new AVA({
    llm: {
      model: models
        ? models.model(model || models.active(), signal, progress, (text) => {
            // Only the first response within visualize is the type selection. Never
            // persist prompts, reasoning or full model/configuration responses here.
            if (visualizing && chartSelection === undefined)
              chartSelection = text
                .trim()
                .replace(/^["']|["']$/g, '')
                .toLowerCase()
                .slice(0, 80);
          })
        : 'not-configured',
      maxRetries: 0,
    },
    engine: {
      type: 'duckdb',
      // Omitting this would restore AVA's default 512MB budget.
      memoryLimit: '-1',
      threads: 2,
      queryTimeoutMs: 30000,
    },
  });
  const started = new Map<string, number>();
  for (const event of Object.keys(progressLabels))
    ava.on(event, (payload: { data?: Record<string, unknown> | null }) => {
      if (event === 'visualizestart') {
        visualizing = true;
        chartSelection = undefined;
      }
      const p = analysisProgress(event, payload.data);
      if (event === 'visualizeend') {
        visualizing = false;
        p.chartSelection = chartSelection;
        if (p.error) {
          p.chartOutcome = 'failed';
          p.label = chartSelection === undefined ? '图表类型选择失败' : '图表配置生成失败';
          if (chartSelection)
            p.detail = `模型选择图表类型：${JSON.stringify(chartSelection)}。${p.detail || ''}`;
        }
      }
      const stage = event.replace(/(start|end)$/, '');
      if (event.endsWith('start')) started.set(stage, Date.now());
      if (event.endsWith('end') && started.has(stage)) {
        p.durationMs = Date.now() - started.get(stage)!;
        started.delete(stage);
      }
      if (dataset?.format === 'mysql' && p.error && ['sourceend', 'schemaend'].includes(event))
        p.detail = connectionFailure(payload.data?.error);
      if (event === 'profileend' && dataset?.profile && !p.error) {
        p.label = dataset.format === 'mysql' ? '已采用表结构上下文' : '已恢复当前数据画像';
        p.detail =
          dataset.format === 'mysql'
            ? '未全库扫描；行数和统计指标将在实际查询中计算。'
            : '使用源文件变化检查后保存的统计信息。';
      }
      progress?.(p);
    });
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
      if (dataset.format === 'mysql') {
        const schema = await mysqlSchema(ava, dataset.connection!.database);
        await ava.schema({}, () => schema);
      } else await ava.schema();
      // Each operation has its own AVA instance; restore the saved profile so
      // both analysis modes and suggestions receive the saved observations.
      if (dataset.profile) await ava.profile({}, () => dataset.profile!);
      if (dataset.semantic || dataset.metrics?.length)
        await ava.semantic({}, () => businessSemantic(dataset.semantic, dataset.metrics));
    }
    signal?.throwIfAborted();
    return await fn(ava);
  } finally {
    await ava.dispose();
  }
}
export function identifier(s: string) {
  return '"' + s.replaceAll('"', '""') + '"';
}
