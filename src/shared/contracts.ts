import type { AnalysisMode, AnalysisOptions } from '@shared/analysisOptions';
import type { Schema, Profile, AnalysisResponse, ChartSpec } from '@antv/ava';
import type { ThemeSettings } from '@shared/theme';
import type { z } from 'zod';
import type {
  mysqlInputSchema,
  modelConnectionSchema,
  modelInputSchema,
  businessMetricSchema,
} from '@shared/inputSchemas';
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
  archivedAt?: string | null;
  deletedAt?: string | null;
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
  tasks: Task[];
  theme: ThemeSettings;
};
export interface API {
  clipboardWrite(text: string): Promise<void>;
  workspaceGetState(): Promise<State & { revision: number }>;
  analysisGetRun(id: string): Promise<Run>;
  conversationCreate(datasetId: string): Promise<Conversation>;
  conversationArchive(id: string): Promise<void>;
  conversationRestore(id: string): Promise<void>;
  conversationPurge(ids: string[]): Promise<void>;
  settingsSaveTheme(theme: ThemeSettings): Promise<void>;
  datasetTestMySQL(input: MySQLInput): Promise<{ tables: number; rows: number }>;
  datasetSaveMySQL(input: MySQLInput): Promise<Dataset>;
  datasetRefreshMySQL(id: string): Promise<void>;
  analysisExport(id: string, format: 'html' | 'pdf' | 'png', saved?: boolean): Promise<boolean>;
  datasetImport(format?: LocalDataset['format']): Promise<Dataset | null>;
  datasetDelete(id: string): Promise<void>;
  datasetRename(id: string, name: string): Promise<void>;
  datasetRelocate(id: string): Promise<boolean>;
  datasetReparse(id: string): Promise<void>;
  datasetPreview(
    id: string,
    table: string,
    options?: { offset: number; limit: number },
  ): Promise<Record<string, unknown>[]>;
  datasetGetTableDetails(id: string, table: string): Promise<TableDetails>;
  datasetSaveSemantic(id: string, text: string, metrics?: BusinessMetric[]): Promise<void>;
  analysisStart(
    id: string,
    question: string,
    strategy: AnalysisMode,
    options?: AnalysisOptions,
    conversationId?: string,
  ): Promise<string>;
  analysisCancel(taskId: string): Promise<void>;
  snippetRemove(id: string): Promise<void>;
  snippetRename(id: string, title: string): Promise<void>;
  snippetRefresh(id: string): Promise<void>;
  analysisGetChartHTML(runId: string, theme?: ThemeSettings, saved?: boolean): Promise<string>;
  snippetSave(runId: string): Promise<void>;
  modelSave(input: ModelInput): Promise<void>;
  modelListAvailable(input: ModelConnectionInput): Promise<string[]>;
  modelActivate(id: string, model?: string): Promise<void>;
  modelDelete(id: string): Promise<void>;
  workspaceOnChange(callback: () => void): () => void;
  analysisOnTaskChange(callback: (update: TaskUpdate) => void): () => void;
  modelOnTestProgress(callback: (progress: ModelTestProgress) => void): () => void;
}
export type TaskUpdate = { revision: number; task: Task };
