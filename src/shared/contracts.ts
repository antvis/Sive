import type { Schema, Profile, Semantic, AnalysisResponse } from '@antv/ava';
import type { ThemeSettings } from '@shared/theme';
import type { z } from 'zod';
import type { ToolUIPart } from 'ai';
import type {
  mysqlInputSchema,
  modelConnectionSchema,
  modelInputSchema,
  businessMetricSchema,
  analysisModeSchema,
  analysisOptionsSchema,
} from '@shared/inputSchemas';
export type AnalysisMode = z.infer<typeof analysisModeSchema>;
export type AnalysisOptions = z.infer<typeof analysisOptionsSchema>;
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
export type ChartSpec = { chartType: string; config: Record<string, unknown> | string };
export type AnalysisEvidence = { id: string; result: AnalysisResponse };
export type AnalysisChart = {
  resultId: string;
  spec: ChartSpec;
};
export type AnalysisTools = {
  source: { input: Record<string, never>; output: { name: string; format: string } };
  schema: { input: Record<string, never>; output: Schema };
  profile: { input: Record<string, never>; output: Profile };
  semantic: { input: Record<string, never>; output: Semantic };
  inspect: { input: { resultId: string }; output: { resultId: string } };
  analyze: { input: { query: string }; output: { resultId: string } };
  visualize: {
    input: { resultId: string; query: string };
    output: { resultId: string; chartType?: string | null };
  };
};
export type AnalysisToolPart = ToolUIPart<AnalysisTools>;
export type AnalysisOutput = {
  text: string;
  results: AnalysisEvidence[];
  charts: AnalysisChart[];
  warning?: string;
  tools?: AnalysisToolPart[];
  // Read compatibility for analyses saved before native SDK tool parts were adopted.
  actions?: { tool: 'analyze' | 'visualize'; query: string; resultId?: string; error?: string }[];
};
type SnippetSummary = { title: string; updatedAt: string };
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
  snippet?: SnippetSummary & { output?: AnalysisOutput };
  semantic: string;
  metrics?: BusinessMetric[];
  modelName: string;
  output: AnalysisOutput;
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
  'id' | 'conversationId' | 'datasetId' | 'sourceName' | 'question' | 'sequence' | 'createdAt' | 'modelName'
> & { snippet?: SnippetSummary };
export type ModelConnectionInput = z.infer<typeof modelConnectionSchema>;
export type ModelTestProgress = { completed: number; total: number; active: string[] };
export type ModelInput = z.infer<typeof modelInputSchema>;
export type Progress = {
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
  preview?: AnalysisOutput;
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
  conversationRename(id: string, title: string): Promise<void>;
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
  analysisGetChartHTML(
    runId: string,
    theme?: ThemeSettings,
    saved?: boolean,
    index?: number,
  ): Promise<string>;
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
