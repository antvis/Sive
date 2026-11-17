import type {
  AnalysisStrategyConfig,
  DataSourceConfig,
  EngineConfig,
  Profile,
  Schema,
  Semantic,
  SuggestResult,
} from '@antv/ava';
import type { TextStreamPart, ToolSet } from 'ai';
import type { AnalysisMessage } from './messages';
import type { Snippet, SnippetSaveInput, SnippetUpdateInput } from './snippets';

export type { AnalysisMessage } from './messages';

export type { Snippet, SnippetContent, SnippetSaveInput, SnippetSpec, SnippetUpdateInput } from './snippets';

export type DuckDBEngineConfig = Extract<EngineConfig, { type: 'duckdb' }>;

export const LOCAL_FILE_FORMATS = ['csv', 'json', 'xlsx', 'parquet'] as const;

export type LocalFileFormat = (typeof LOCAL_FILE_FORMATS)[number];

export const PREVIEW_PAGE_SIZES = [50, 100, 200] as const;

export const DEFAULT_PREVIEW_PAGE_SIZE = 100;

export type Preferences = {
  theme: { mode: 'light' | 'dark' | 'system'; fontSize: number };
  agent: { maxSteps: number };
  strategy: AnalysisStrategyConfig;
  engine: DuckDBEngineConfig;
};

export const DEFAULT_PREFERENCES = {
  theme: { mode: 'light', fontSize: 14 },
  agent: { maxSteps: 10 },
  strategy: { type: 'direct' },
  engine: {
    type: 'duckdb',
    memoryLimit: '1GB',
    threads: 1,
    queryTimeoutMs: 30000,
    maxTempDirectorySize: '1GB',
  },
} satisfies Preferences;

export function analysisStrategy(
  type: 'direct' | 'loop',
  current: AnalysisStrategyConfig,
): AnalysisStrategyConfig {
  if (type === 'direct') return { type };
  return { type, maxSteps: current.type === 'loop' ? current.maxSteps : 12 };
}

export type CacheInfo = { path: string; usedBytes: number; freeBytes: number };

export type DataStorageInfo = { path: string; directory: string; sizeBytes: number };

export type StorageInfo = { cache: CacheInfo; data: DataStorageInfo };

export type UpdateResult = { currentVersion: string; latestVersion: string; hasUpdate: boolean };

export type DatasetPreviewOptions = { offset: number; limit: number };

export type ModelConnectionInput = {
  baseURL: string;
  apiKey?: string;
  credentialSourceId?: string;
};

export type ModelTestProgress = { completed: number; total: number; active: string[] };

export type ModelProfile = {
  id: string;
  name: string;
  model: string;
  modelIds: string[];
  baseURL: string;
  hasKey: boolean;
  updatedAt: string;
};

export type ModelInput = {
  id?: string;
  name: string;
  modelIds: string[];
  baseURL: string;
  apiKey?: string;
  credentialSourceId?: string;
};

export type Conversation = {
  id: string;
  datasetId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
};

export type DatasetSummary = {
  id: string;
  name: string;
  sourceType: string;
  updatedAt: string;
  fileSize?: number;
  rowCount?: number;
  columnCount: number;
  tableCount?: number;
  localFile: boolean;
  fileUnavailable?: boolean;
};

export type DatasetDetail = DatasetSummary & {
  sourceConfig: DataSourceConfig;
  schema: Schema;
  profile: Profile;
  semantic: Semantic;
};

export type AnalysisStartInput = {
  datasetId: string;
  question: string;
  strategy: AnalysisStrategyConfig;
  conversationId?: string;
};

export type AnalysisTaskEvent = {
  taskId: string;
  datasetId: string;
  conversationId: string;
  status: 'running' | 'done' | 'error' | 'cancelled';
  stage?: string;
  error?: string;
  part?: TextStreamPart<ToolSet>;
};

export type WorkspaceState = {
  conversations: Conversation[];
  archivedConversations: Conversation[];
  datasets: DatasetSummary[];
  snippets: Snippet[];
  models: ModelProfile[];
  activeModelId: string;
  preferences: Preferences;
  revision: number;
};

export type WorkbenchApi = {
  workspaceGetState(): Promise<WorkspaceState>;
  workspaceOnChange(callback: () => void): () => void;
  datasetSelectLocal(
    format?: LocalFileFormat,
    lastDirectory?: string,
  ): Promise<{ name: string; sourceConfig: DataSourceConfig; directory: string } | null>;
  datasetRefresh(id: string): Promise<void>;
  datasetTest(sourceConfig: DataSourceConfig): Promise<void>;
  datasetSave(name: string, sourceConfig: DataSourceConfig, id?: string): Promise<void>;
  datasetGet(id: string): Promise<DatasetDetail | null>;
  // Returns up to limit + 1 rows so the preview can determine whether another page exists.
  datasetPreview(
    id: string,
    table?: string,
    options?: DatasetPreviewOptions,
  ): Promise<Record<string, unknown>[]>;
  datasetSuggest(id: string): Promise<SuggestResult[]>;
  datasetSaveSemantic(id: string, semantic: Semantic): Promise<void>;
  datasetRename(id: string, name: string): Promise<void>;
  datasetDelete(id: string): Promise<void>;
  settingsSavePreferences(preferences: Preferences): Promise<void>;
  systemGetStorageInfo(): Promise<StorageInfo>;
  systemOpen(type: 'directory' | 'url', path: string): Promise<void>;
  aboutGetVersion(): Promise<string>;
  aboutCheckUpdates(): Promise<UpdateResult>;
  modelListAvailable(input: ModelConnectionInput): Promise<string[]>;
  modelSave(input: ModelInput): Promise<void>;
  modelOnTestProgress(callback: (progress: ModelTestProgress) => void): () => void;
  modelActivate(id: string, model?: string): Promise<void>;
  modelDelete(id: string): Promise<void>;
  analysisStart(input: AnalysisStartInput): Promise<{ taskId: string; conversationId: string }>;
  analysisCancel(taskId: string): Promise<void>;
  analysisGetMessages(conversationId: string): Promise<AnalysisMessage[]>;
  analysisOnTaskChange(callback: (event: AnalysisTaskEvent) => void): () => void;
  snippetSave(input: SnippetSaveInput): Promise<Snippet>;
  snippetUpdate(messageId: string, input: SnippetUpdateInput): Promise<void>;
  snippetRemove(messageId: string): Promise<void>;
  conversationRename(id: string, title: string): Promise<void>;
  conversationArchive(id: string): Promise<void>;
  conversationRestore(id: string): Promise<void>;
  conversationPurge(ids: string[]): Promise<void>;
};
