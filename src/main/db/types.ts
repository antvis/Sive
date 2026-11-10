import type { AnalysisOptions } from '@shared/analysisOptions';
import type { AnalysisOutput, Dataset, ModelProfile, Progress, Task } from '@shared/contracts';
export type { AnalysisOutput } from '@shared/contracts';

export type StoredModel = Omit<ModelProfile, 'hasKey' | 'updatedAt'> & {
  encryptedKey?: string;
  updatedAt?: string;
};

export type SourceCredentials = { password: string };
export type StoredDataset = Dataset & { file: string; credentials?: SourceCredentials };
export type SourceConfig = {
  path?: string;
  excelSheets?: Dataset['excelSheets'];
  connection?: Dataset['connection'];
  credentials?: SourceCredentials;
};
export type SourceSnapshot = {
  name: string;
  format: Dataset['format'];
  config: Omit<SourceConfig, 'credentials'>;
};

export type MessageOptions = {
  model: { provider_id: string; provider_name: string; model_name: string };
  source: SourceSnapshot;
  semantic: string;
  metrics?: Dataset['metrics'];
  dataVersion?: string;
  analyze: { strategy: { type: string } & AnalysisOptions; includeSummary: boolean };
  query: { maxRows: number; maxResultBytes: number };
};
export type StoredAnalysisOptions = MessageOptions | Record<string, never>;

export type UserMessageContent = { text: string };
export type AssistantMessageContent = {
  output?: AnalysisOutput;
  events: Progress[];
  preview?: Task['preview'];
  error?: string;
  persistence_error?: string;
};
export type MessageContent = UserMessageContent | AssistantMessageContent;

export type SnippetContent = Pick<AssistantMessageContent, 'output' | 'error'>;
