import type {
  AnalysisStrategyConfig,
  DataSourceConfig,
  EngineConfig,
  Profile,
  Schema,
  Semantic,
  SuggestResult,
} from '@antv/ava';
import type { UIMessage, UIMessageChunk } from 'ai';
import { isTextUIPart, validateUIMessages } from 'ai';
import { z } from 'zod';
import type { LocalFileFormat } from './dataSource';
import type { GitHubRepositoryPage, GitHubRepositoryListInput } from './github';

import type { Snippet, SnippetSpec, SnippetContent, SnippetSaveInput, SnippetUpdateInput } from './schema';

export type { Snippet, SnippetContent, SnippetSaveInput, SnippetSpec, SnippetUpdateInput };

export type DuckDBEngineConfig = Extract<EngineConfig, { type: 'duckdb' }>;

export const PREVIEW_PAGE_SIZES = [50, 100, 200] as const;

export const DEFAULT_PREVIEW_PAGE_SIZE = 100;

export type Preferences = {
  language: 'zh-CN' | 'en-US';
  theme: { mode: 'light' | 'dark' | 'system'; fontSize: number };
  agent: { maxSteps: number };
  strategy: AnalysisStrategyConfig;
  engine: DuckDBEngineConfig;
  diagnostics: { nativeCrashReporting: boolean };
  autoCheckUpdates: boolean;
};

export const DEFAULT_PREFERENCES = {
  language: 'zh-CN',
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
  diagnostics: { nativeCrashReporting: false },
  autoCheckUpdates: true,
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

export type SupabaseOAuthResult = {
  sessionId: string;
  projects: { id: string; name: string }[];
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

export type ChatMessage = UIMessage<{ createdAt: string }>;

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

export const analysisStartSchema = z.object({
  chatId: z.string().min(1),
  datasetId: z.string().min(1),
  message: z.unknown().transform(async (value) => {
    const [message] = await validateUIMessages<ChatMessage>({ messages: [value] });
    if (message.role !== 'user' || !message.parts.every(isTextUIPart)) {
      throw new Error('仅支持发送用户文本消息。');
    }
    return message;
  }),
  strategy: z.discriminatedUnion('type', [
    z.object({ type: z.literal('direct'), maxRetries: z.number().int().nonnegative().optional() }),
    z.object({ type: z.literal('loop'), maxSteps: z.number().int().positive().optional() }),
  ]),
});

export type AnalysisStartInput = z.infer<typeof analysisStartSchema>;

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
  datasetTest(sourceConfig: DataSourceConfig, authSessionId?: string): Promise<void>;
  datasetExtractText(text: string): Promise<Record<string, unknown>[]>;
  datasetSave(
    name: string,
    sourceConfig: DataSourceConfig,
    id?: string,
    authSessionId?: string,
  ): Promise<void>;
  oAuthStart(type: DataSourceConfig['type']): Promise<SupabaseOAuthResult>;
  githubConnect(connectionId: string): Promise<{ login: string }>;
  githubConnectCancel(connectionId: string): Promise<void>;
  githubRepositories(input: GitHubRepositoryListInput): Promise<GitHubRepositoryPage>;
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
  aboutTakeUpdateNotification(): Promise<UpdateResult | null>;
  aboutOnUpdateAvailable(callback: () => void): () => void;
  modelListAvailable(input: ModelConnectionInput): Promise<string[]>;
  modelSave(input: ModelInput): Promise<void>;
  modelOnTestProgress(callback: (progress: ModelTestProgress) => void): () => void;
  modelActivate(id: string, model?: string): Promise<void>;
  modelDelete(id: string): Promise<void>;
  analysisStart(input: AnalysisStartInput): Promise<void>;
  analysisCancel(conversationId: string): Promise<void>;
  analysisGetMessages(conversationId: string): Promise<ChatMessage[]>;
  analysisOnChunk(callback: (messageId: string, chunk: UIMessageChunk | null) => void): () => void;
  snippetSave(input: SnippetSaveInput): Promise<Snippet>;
  snippetUpdate(messageId: string, input: SnippetUpdateInput): Promise<void>;
  snippetRemove(messageId: string): Promise<void>;
  conversationRename(id: string, title: string): Promise<void>;
  conversationArchive(id: string): Promise<void>;
  conversationRestore(id: string): Promise<void>;
  conversationPurge(ids: string[]): Promise<void>;
};
