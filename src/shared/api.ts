import type { Schema, Semantic, SuggestResult } from '@antv/ava';
import type { TextStreamPart, ToolSet } from 'ai';
import type { AnalysisMessage } from './messages';

export type { AnalysisMessage } from './messages';

export type ThemeSettings = { mode: 'light' | 'dark' };

export type Preferences = {
  analysisMode: 'direct' | 'loop';
  sendShortcut: 'enter' | 'mod-enter';
};

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
  models: ModelProfile[];
  activeModelId: string;
  theme: ThemeSettings;
  preferences: Preferences;
  revision: number;
};

export type WorkbenchApi = {
  workspaceGetState(): Promise<WorkspaceState>;
  workspaceOnChange(callback: () => void): () => void;
  datasetImportCsv(lastDirectory?: string): Promise<(DatasetSummary & { directory: string }) | null>;
  datasetGet(id: string): Promise<DatasetDetail | null>;
  datasetPreview(id: string): Promise<Record<string, unknown>[]>;
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
  conversationRename(id: string, title: string): Promise<void>;
  conversationArchive(id: string): Promise<void>;
  conversationRestore(id: string): Promise<void>;
  conversationPurge(ids: string[]): Promise<void>;
};
