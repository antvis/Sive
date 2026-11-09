import type { datasets, messages } from './schema';
import type { AnalysisOptions } from '@shared/analysisOptions';
import type { Task } from '@shared/contracts';
import type { AssistantMessageContent, MessageOptions, SourceSnapshot, StoredDataset } from './types';

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
  const options = row.analysisOptions as MessageOptions;
  const content = row.content as AssistantMessageContent;
  const task = {
    id: row.id,
    datasetId: row.datasetId,
    conversationId: row.conversationId,
    sequence: row.sequence,
    question: row.question,
    strategy: options.analyze.strategy.type,
    analysisOptions: analysisOptions(options),
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

export function analysisOptions(options: MessageOptions): AnalysisOptions {
  const { maxRetries, maxSteps } = options.analyze.strategy;
  return {
    ...(maxRetries !== undefined ? { maxRetries } : {}),
    ...(maxSteps !== undefined ? { maxSteps } : {}),
  };
}
