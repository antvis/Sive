// Types for database entities and IPC messages.

import type { AnalysisStrategyConfig, ChartConfig } from '@antv/ava';
import type { AnalysisTrace } from './analysis-trace';

export type { DataSourceConfig, Profile, Schema, Semantic } from '@antv/ava';

export type AnalysisOptions = {
  strategy?: AnalysisStrategyConfig;
  model?: string;
};

export type SnippetSpec = ChartConfig;

export type SnippetMetric = {
  label: string;
  value: string;
  unit: string;
};

export type SnippetContent = {
  trace?: AnalysisTrace | null;
  question: string;
  intent: string;
  title: string;
  summary: string;
  spec: SnippetSpec;
  tags: string[];
  metrics: SnippetMetric[];
};

export type SnippetSaveInput = SnippetContent & { messageId: string };

export type SnippetUpdateInput = Partial<Pick<SnippetContent, 'title' | 'summary'>> & {
  templateId?: string;
};

export type Snippet = SnippetContent & {
  id: string;
  messageId: string;
  trace: AnalysisTrace | null;
  templateId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
