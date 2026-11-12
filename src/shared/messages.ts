import type { AnalysisResponse, VisualizeResponse } from '@antv/ava';
import type { TextStreamPart, ToolSet } from 'ai';

export type MessageContent = {
  question?: string;
  stage?: string;
  error?: string;
} & Partial<AnalysisResponse> & {
    chartHtml?: VisualizeResponse['html'];
    parts?: TextStreamPart<ToolSet>[];
  };

export type AnalysisMessage = {
  id: string;
  conversationId: string;
  sequence: number;
  role: 'user' | 'assistant';
  status: 'running' | 'cancelling' | 'done' | 'error' | 'cancelled' | 'interrupted';
  content: MessageContent;
  analysisOptions: unknown;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
