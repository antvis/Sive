import type { VisualizeResponse } from '@antv/ava';

export type SnippetSpec = VisualizeResponse['config'];

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
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
