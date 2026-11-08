import type { AnalysisMode, AnalysisOptions } from './analysis-options';
import type { Schema, Profile, AnalysisResponse, ChartSpec } from '@antv/ava';
import type { ThemeSettings } from './theme';
import type { z } from 'zod';
import type {
  mysqlInputSchema,
  modelConnectionSchema,
  modelInputSchema,
  businessMetricSchema,
} from './input-schemas';
export type MySQLInput = z.infer<typeof mysqlInputSchema>;
export type ConnectionInfo = Omit<MySQLInput, 'id' | 'name' | 'password'> & {
  hasPassword: boolean;
  checkedAt?: string;
  status: 'ready' | 'error';
  error?: string;
};
type DatasetFields = {
  id: string;
  deletedAt?: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  schema: Schema;
  profile: Profile;
  semantic: string;
  metrics?: BusinessMetric[];
  excelSheets?: ExcelSheet[];
};
export type LocalDataset = DatasetFields & {
  format: 'csv' | 'json' | 'xlsx' | 'parquet';
  connection?: never;
};
export type MySQLDataset = DatasetFields & { format: 'mysql'; connection: ConnectionInfo };
export type Dataset = LocalDataset | MySQLDataset;
export type ExcelSheet = { sheet: string; header: boolean; range?: string; stop_at_empty?: boolean };
export type TableDetails = {
  indexes: { name: string; columns: string[]; unique: boolean; type: string }[];
  ddl?: string;
  ddlError?: string;
};
export type BusinessMetric = z.infer<typeof businessMetricSchema>;
export type Run = {
  id: string;
  conversationId: string;
  datasetId: string;
  sourceName: string;
  sequence: number;
  excelSheets?: ExcelSheet[];
  question: string;
  strategy: string;
  analysisOptions?: AnalysisOptions;
  createdAt: string;
  savedAt?: string; // Explicitly added to Saved Analyses by the user.
  savedTitle?: string;
  semantic: string;
  metrics?: BusinessMetric[];
  modelName: string;
  result: AnalysisResponse;
  chart?: ChartSpec;
  chartError?: string;
  savedView?: {
    result: AnalysisResponse;
    chart?: ChartSpec;
    updatedAt: string;
  };
  events: Progress[];
};
export type ModelProfile = {
  id: string;
  name: string;
  model: string;
  modelIds: string[];
  baseURL: string;
  hasKey: boolean;
  updatedAt: string;
};
export type RunSummary = Pick<
  Run,
  | 'id'
  | 'conversationId'
  | 'datasetId'
  | 'sourceName'
  | 'question'
  | 'strategy'
  | 'analysisOptions'
  | 'sequence'
  | 'createdAt'
  | 'savedAt'
  | 'savedTitle'
  | 'modelName'
> & { viewUpdatedAt?: string };
export type ModelConnectionInput = z.infer<typeof modelConnectionSchema>;
export type ModelTestProgress = { completed: number; total: number; active: string[] };
export type ModelInput = z.infer<typeof modelInputSchema>;
export type Progress = {
  chartOutcome?: 'generated' | 'not-needed' | 'empty-data' | 'invalid-response' | 'failed';
  chartSelection?: string;
  at: string;
  stage: string;
  label: string;
  error?: boolean;
  detail?: string;
  sql?: string;
  durationMs?: number;
  recovery?: string;
};
type TaskFields = {
  id: string;
  conversationId?: string;
  datasetId: string;
  question: string;
  sequence?: number;
  strategy?: string;
  analysisOptions?: AnalysisOptions;
  modelName?: string;
  sourceName?: string;
  startedAt?: string;
  finishedAt?: string;
  events: Progress[];
  error?: string;
  persistenceError?: string;
  runId?: string;
  preview?: AnalysisResponse;
};
export type Task = TaskFields &
  (
    | { status: 'done'; runId: string; finishedAt: string }
    | { status: 'running' | 'cancelling' | 'error' | 'cancelled' | 'interrupted' }
  );
export type Conversation = {
  deletedAt?: string;
  id: string;
  datasetId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};
export type State = {
  refreshingSavedId?: string;
  conversations: Conversation[];
  deletedConversations: Conversation[];
  datasets: Dataset[];
  runs: RunSummary[];
  models: ModelProfile[];
  activeModelId: string;
  task: Task | null;
  tasks: Task[];
  theme: ThemeSettings;
};
export interface API {
  writeClipboard(text: string): Promise<void>;
  state(): Promise<State & { revision: number }>;
  run(id: string): Promise<Run>;
  createConversation(datasetId: string): Promise<Conversation>;
  deleteConversation(id: string): Promise<void>;
  restoreConversation(id: string): Promise<void>;
  purgeConversations(ids: string[]): Promise<void>;
  saveTheme(theme: ThemeSettings): Promise<void>;
  testMySQL(input: MySQLInput): Promise<{ tables: number; rows: number }>;
  saveMySQL(input: MySQLInput): Promise<Dataset>;
  refreshMySQL(id: string): Promise<void>;
  exportAnalysis(id: string, format: 'html' | 'pdf' | 'png', saved?: boolean): Promise<boolean>;
  importData(format?: LocalDataset['format']): Promise<Dataset | null>;
  deleteData(id: string): Promise<void>;
  renameData(id: string, name: string): Promise<void>;
  relocateData(id: string): Promise<boolean>;
  reparseData(id: string): Promise<void>;
  preview(
    id: string,
    table: string,
    options?: { offset: number; limit: number },
  ): Promise<Record<string, unknown>[]>;
  tableDetails(id: string, table: string): Promise<TableDetails>;
  semantic(id: string, text: string, metrics?: BusinessMetric[]): Promise<void>;
  analyze(
    id: string,
    question: string,
    strategy: AnalysisMode,
    options?: AnalysisOptions,
    conversationId?: string,
  ): Promise<string>;
  cancel(): Promise<void>;
  removeSavedAnalysis(id: string): Promise<void>;
  renameSavedAnalysis(id: string, title: string): Promise<void>;
  refreshSavedAnalysis(id: string): Promise<void>;
  chartHTML(runId: string, theme?: ThemeSettings, saved?: boolean): Promise<string>;
  saveAnalysis(runId: string): Promise<void>;
  saveModel(input: ModelInput): Promise<void>;
  listModels(input: ModelConnectionInput): Promise<string[]>;
  activateModel(id: string, model?: string): Promise<void>;
  deleteModel(id: string): Promise<void>;
  onChange(callback: () => void): () => void;
  onTaskChange(callback: (update: TaskUpdate) => void): () => void;
  onModelTest(callback: (progress: ModelTestProgress) => void): () => void;
}
export type TaskUpdate = { revision: number; task: Task };
