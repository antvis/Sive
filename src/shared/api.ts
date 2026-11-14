import type { Schema, Semantic, SuggestResult } from '@antv/ava';
import type { TextStreamPart, ToolSet } from 'ai';
import type { AnalysisMessage } from './messages';
import type { Snippet, SnippetSaveInput, SnippetUpdateInput } from './snippets';
import type { MySQLConnection, MySQLInput } from './mysql';

export type { AnalysisMessage } from './messages';
export type { Snippet, SnippetContent, SnippetSaveInput, SnippetSpec, SnippetUpdateInput } from './snippets';

export type ThemeSettings = { mode: 'light' | 'dark' };

export const LOCAL_FILE_FORMATS = ['csv', 'json', 'xlsx', 'parquet'] as const;

export type LocalFileFormat = (typeof LOCAL_FILE_FORMATS)[number];

export const PREVIEW_PAGE_SIZES = [50, 100, 200] as const;

export type Preferences = {
  analysisMode: 'direct' | 'loop';
  sendShortcut: 'enter' | 'mod-enter';
  previewPageSize: (typeof PREVIEW_PAGE_SIZES)[number];
};

export const DEFAULT_PREFERENCES: Preferences = {
  analysisMode: 'direct',
  sendShortcut: 'enter',
  previewPageSize: 100,
};

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

export type DatasetDetail = DatasetSummary & { schema: Schema; semantic: Semantic };

export type AnalysisStartInput = {
  datasetId: string;
  question: string;
  strategy: 'direct' | 'loop';
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
  theme: ThemeSettings;
  preferences: Preferences;
  revision: number;
};

export type WorkbenchApi = {
  workspaceGetState(): Promise<WorkspaceState>;
  workspaceOnChange(callback: () => void): () => void;
  datasetImportLocal(
    format?: LocalFileFormat,
    lastDirectory?: string,
  ): Promise<(DatasetSummary & { directory: string }) | null>;
  datasetRelocate(id: string): Promise<boolean>;
  datasetRefresh(id: string): Promise<void>;
  datasetMySQLGet(id: string): Promise<MySQLConnection>;
  datasetMySQLTest(input: MySQLInput): Promise<void>;
  datasetMySQLSave(input: MySQLInput): Promise<void>;
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
  settingsSaveTheme(theme: ThemeSettings): Promise<void>;
  settingsSavePreferences(preferences: Preferences): Promise<void>;
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
