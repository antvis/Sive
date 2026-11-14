import type { ChartConfig } from '@antv/ava';

export type SnippetSpec = ChartConfig;

export type SnippetContent = {
  question: string;
  spec: SnippetSpec;
  summary: string;
};

export type SnippetSaveInput = SnippetContent & { messageId: string };

export type SnippetUpdateInput = { title: string; summary: string };

export type Snippet = {
  id: string;
  messageId: string;
  title: string;
  content: SnippetContent;
  isVisible: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
