import type { datasets, conversations, messages } from './db/schema';
import type { AnalysisOptions } from '@shared/analysisOptions';
import type { Conversation, Dataset, ModelProfile, Progress, Run, Task } from '@shared/contracts';

export type StoredModel = Omit<ModelProfile, 'hasKey' | 'updatedAt'> & {
  encryptedKey?: string;
  updatedAt?: string;
};
export type StoredDataset = Dataset & { file: string; encryptedCredentials?: string };
export type SourceConfig = {
  path?: string;
  excelSheets?: Dataset['excelSheets'];
  connection?: Dataset['connection'];
};
type SourceSnapshot = { name: string; format: Dataset['format']; config: SourceConfig };
export type MessageOptions = {
  model: { provider_id: string; provider_name: string; model_name: string };
  source: SourceSnapshot;
  semantic: string;
  metrics?: Dataset['metrics'];
  analyze: { strategy: { type: string } & AnalysisOptions; includeSummary: boolean };
  query: { maxRows: number; maxResultBytes: number };
};
export type MessageContent = {
  result?: Run['result'];
  chart?: Run['chart'];
  chart_error?: string;
  events: Progress[];
  preview?: Task['preview'];
  error?: string;
  persistence_error?: string;
};
export type AnalysisOutput = Pick<Run, 'result' | 'chart' | 'chartError'>;
export type SnippetContent = Pick<MessageContent, 'result' | 'chart_error' | 'error'> & {
  chart?: Run['chart'] | null;
};
export type DatasetRow = typeof datasets.$inferSelect;
type ConversationRow = typeof conversations.$inferSelect;
type MessageRow = typeof messages.$inferSelect & { dataset_id: string; question: string };

export const parseJSON = <T>(value: string): T => JSON.parse(value) as T;
export const conversationRecord = (row: ConversationRow): Conversation => ({
  id: row.id,
  datasetId: row.dataset_id,
  title: row.title,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at ?? undefined,
});
export const sourceSnapshot = (dataset: StoredDataset): SourceSnapshot => ({
  name: dataset.name,
  format: dataset.format,
  config:
    dataset.format === 'mysql'
      ? { connection: dataset.connection }
      : { path: dataset.file, excelSheets: dataset.excelSheets },
});
export function taskRecord(row: MessageRow): Task {
  const options = parseJSON<MessageOptions>(row.analysis_options);
  const content = parseJSON<MessageContent>(row.content);
  const task = {
    id: row.id,
    datasetId: row.dataset_id,
    conversationId: row.conversation_id,
    sequence: row.sequence,
    question: row.question,
    strategy: options.analyze.strategy.type,
    analysisOptions: analysisOptions(options),
    modelName: `${options.model.provider_name} · ${options.model.model_name}`,
    sourceName: options.source.name,
    startedAt: row.created_at,
    events: content.events,
    preview: content.preview,
    error: content.error,
    persistenceError: content.persistence_error,
  };
  return row.status === 'done'
    ? { ...task, status: 'done', runId: row.id, finishedAt: row.updated_at }
    : {
        ...task,
        status: row.status,
        finishedAt: ['running', 'cancelling'].includes(row.status) ? undefined : row.updated_at,
      };
}
export function analysisOptions(options: MessageOptions): AnalysisOptions {
  const { maxRetries, maxSteps } = options.analyze.strategy;
  return {
    ...(maxRetries !== undefined ? { maxRetries } : {}),
    ...(maxSteps !== undefined ? { maxSteps } : {}),
  };
}
