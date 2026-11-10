import { WorkbenchError } from '@shared/errors';
import type { datasets, messages } from './schema';
import type { AnalysisOptions, Task } from '@shared/contracts';
import type { MessageOptions, SourceSnapshot, StoredDataset } from './types';

export type {
  AnalysisOutput,
  AssistantMessageContent,
  MessageContent,
  MessageOptions,
  SnippetContent,
  SourceConfig,
  SourceCredentials,
  SourceSnapshot,
  StoredAnalysisOptions,
  StoredDataset,
  StoredModel,
  UserMessageContent,
} from './types';

export type DatasetRow = typeof datasets.$inferSelect;

type MessageRow = typeof messages.$inferSelect & { datasetId: string; question: string };

export const sourceSnapshot = (dataset: StoredDataset): SourceSnapshot => ({
  name: dataset.name,
  format: dataset.format,
  config:
    dataset.format === 'mysql'
      ? { connection: dataset.connection }
      : { path: dataset.file, excelSheets: dataset.excelSheets },
});
export function taskRecord(row: MessageRow): Task {
  const options = row.analysisOptions;
  const content = row.content;
  if (!('events' in content)) throw new WorkbenchError('CONFLICT', '分析记录不存在');
  const task = {
    id: row.id,
    datasetId: row.datasetId,
    conversationId: row.conversationId,
    sequence: row.sequence,
    question: row.question,
    strategy: options.analyze.strategy.type,
    analysisOptions: analysisOptions(options.analyze.strategy),
    modelName: `${options.model.provider_name} · ${options.model.model_name}`,
    sourceName: options.source.name,
    startedAt: row.createdAt,
    events: content.events,
    preview: content.preview,
    error: content.error,
    persistenceError: content.persistence_error,
  };
  return row.status === 'done'
    ? { ...task, status: 'done', runId: row.id, finishedAt: row.updatedAt }
    : {
        ...task,
        status: row.status,
        finishedAt: ['running', 'cancelling'].includes(row.status) ? undefined : row.updatedAt,
      };
}

export function analysisOptions({
  maxRetries,
  maxSteps,
}: MessageOptions['analyze']['strategy']): AnalysisOptions {
  return {
    ...(maxRetries !== undefined ? { maxRetries } : {}),
    ...(maxSteps !== undefined ? { maxSteps } : {}),
  };
}

export function datasetRecord(row: DatasetRow): StoredDataset {
  const source = row.sourceConfig;
  const fields = {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt ?? undefined,
    schema: row.schema,
    profile: row.profile,
    semantic: row.semantic,
    metrics: row.metrics ?? undefined,
  };
  if (row.sourceType === 'mysql') {
    // Deleted sources retain their display identity after their connection config is cleared.
    const connection: NonNullable<StoredDataset['connection']> = source.connection ?? {
      host: '',
      port: 3306,
      database: '',
      user: '',
      status: 'error',
      hasPassword: false,
    };
    return {
      ...fields,
      format: 'mysql',
      file: '',
      connection: { ...connection, hasPassword: !!source.credentials?.password },
      credentials: source.credentials,
    };
  }
  const format = row.sourceType;
  if (format !== 'csv' && format !== 'json' && format !== 'xlsx' && format !== 'parquet')
    throw new WorkbenchError('CONNECTION', `当前应用尚不支持此数据源类型：${row.sourceType}`);
  return {
    ...fields,
    format,
    file: source.path || '',
    excelSheets: source.excelSheets,
  };
}
