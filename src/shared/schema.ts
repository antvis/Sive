// Types for database entities and IPC messages.

import type { AnalysisResponse, AnalysisStrategyConfig, ChartConfig } from '@antv/ava';
import type { TextStreamPart, ToolSet } from 'ai';

export type { DataSourceConfig, Profile, Schema, Semantic } from '@antv/ava';

export type AnalysisOptions = {
  strategy?: AnalysisStrategyConfig;
  model?: string;
};

export type MessageContent = {
  question?: string;
  stage?: string;
  error?: string;
} & Partial<AnalysisResponse> & {
    parts?: TextStreamPart<ToolSet>[];
  };

export type SnippetSpec = ChartConfig;

export type AnalysisMessage = {
  id: string;
  conversationId: string;
  sequence: number;
  role: 'user' | 'assistant';
  status: 'running' | 'cancelling' | 'done' | 'error' | 'cancelled' | 'interrupted';
  content: MessageContent;
  analysisOptions: AnalysisOptions;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type SnippetContent = {
  question: string;
  intent: string;
  title: string;
  summary: string;
  spec: SnippetSpec;
  tags: string[];
};

export type SnippetSaveInput = SnippetContent & { messageId: string };

export type SnippetUpdateInput = Partial<Pick<SnippetContent, 'title' | 'summary'>> & {
  templateId?: string;
};

export type Snippet = SnippetContent & {
  id: string;
  messageId: string;
  templateId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
