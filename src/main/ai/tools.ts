import { statSync } from 'node:fs';
import { tool } from 'ai';
import type { LanguageModel, Tool } from 'ai';
import { z } from 'zod';
import type { AnalysisStrategyConfig, AVA, DataSourceConfig, Profile, Schema, Semantic } from '@antv/ava';
import { isAnalysisToolResult, requireAnalysisResult } from '@shared/analysis-trace';
import type { AnalysisToolOutput, AnalysisTrace } from '@shared/analysis-trace';
import { analysisStartSchema } from '@shared/api';
import type { SnippetContent } from '@shared/api';
import { createAnalysisTraceCollector } from '../util/ava';
import { localFilePath } from '../util/localFile';
import { getTextFromLastUserMessage } from '../util/message';
import { generateSnippet } from './snippet-agent';

export type ToolDataset = {
  id: string;
  name: string;
  sourceType: DataSourceConfig['type'];
  sourceConfig: DataSourceConfig;
  schema: Schema;
  profile: Profile;
  semantic: Semantic;
};

export type ToolContext = {
  dataset: ToolDataset;
};

export type ToolOptions = {
  strategy: AnalysisStrategyConfig;
};

type ExecutableTool<T extends Tool = Tool> = T & Required<Pick<T, 'execute'>>;

type AnalysisTools = Record<'source' | 'schema' | 'profile' | 'semantic', ExecutableTool> & {
  analyze: ExecutableTool<Tool<{ query: string }, AnalysisToolOutput, ToolOptions>>;
  visualize: ExecutableTool<
    Tool<{ analysisId: string }, SnippetContent | null, { traces: ReadonlyMap<string, AnalysisTrace> }>
  >;
};

export function createTools(ava: AVA, { dataset }: ToolContext, model: LanguageModel): AnalysisTools {
  return {
    source: tool({
      description: 'Load the configured dataset before the first analysis.',
      inputSchema: z.object({}),
      async execute() {
        await ava.source(dataset.sourceConfig);
        let fileSize: number | undefined;
        const file = localFilePath(dataset.sourceConfig);
        if (file) {
          try {
            fileSize = statSync(file).size;
          } catch {
            fileSize = undefined;
          }
        }
        return {
          name: dataset.name,
          sourceType: dataset.sourceType,
          rowCount: dataset.profile.models.find((model) => model.name === dataset.schema.models[0]?.name)
            ?.metrics.row_count,
          columnCount: dataset.schema.models[0]?.columns.length ?? 0,
          fileSize,
        };
      },
    }),
    schema: tool({
      description: 'Infer the dataset schema after source is loaded.',
      inputSchema: z.object({}),
      execute: () => ava.schema(),
    }),
    profile: tool({
      description: 'Profile the dataset after schema is ready.',
      inputSchema: z.object({}),
      execute: () => ava.profile({ metrics: ['row_count', 'null_count', 'min', 'max', 'mean'] }),
    }),
    semantic: tool({
      description: 'Apply the configured business semantic layer after profiling.',
      inputSchema: z.object({}),
      execute: () => ava.semantic({}, () => dataset.semantic),
    }),
    analyze: tool({
      description: 'Analyze the loaded dataset and return the actual query, SQL, text conclusion and rows.',
      inputSchema: z.object({ query: z.string().min(1) }),
      contextSchema: z.object({ strategy: analysisStartSchema.shape.strategy }),
      async execute({ query }, { toolCallId, context: { strategy } }) {
        const options = {
          datasetId: dataset.id,
          datasetName: dataset.name,
          query,
          strategy,
          toolCallId,
        };
        const collector = createAnalysisTraceCollector(ava, options);
        const result = await collector.run(() => ava.analyze(query, { strategy })).catch(() => null);
        return { result, trace: collector.toJSON() };
      },
      toModelOutput({ output, toolCallId }) {
        if (!isAnalysisToolResult(output) || output.result === null) {
          return { type: 'error-text', value: '分析未完成。' };
        }
        return {
          type: 'json',
          value: JSON.parse(JSON.stringify({ analysisId: toolCallId, result: output.result })),
        };
      },
    }),
    visualize: tool({
      description: 'Create a chart for a relevant analysis result using the analysisId returned by analyze.',
      inputSchema: z.object({ analysisId: z.string().min(1) }),
      contextSchema: z.object({
        traces: z.custom<ReadonlyMap<string, AnalysisTrace>>((value) => value instanceof Map),
      }),
      async execute({ analysisId }, { abortSignal, messages, context: { traces } }): Promise<SnippetContent | null> {
        const analysis = requireAnalysisResult(messages, analysisId);
        const visualization = await ava.visualize(analysis);
        if (!visualization) return null;

        const question = getTextFromLastUserMessage(messages)?.trim() || analysis.query;
        const spec = visualization.config;
        const title = (typeof spec !== 'string' && spec.title) || question;
        const formatted = await generateSnippet({
          model,
          question,
          query: analysis.query,
          title,
          summary: analysis.text,
          spec,
          abortSignal,
        });
        return {
          trace: traces.get(analysisId) ?? null,
          question,
          intent: formatted?.intent ?? '数据笔记',
          title: formatted?.title ?? title,
          summary: formatted?.summary ?? analysis.text,
          spec,
          tags: formatted?.tags ?? [],
          metrics: formatted?.metrics ?? [],
        };
      },
      toModelOutput({ output }) {
        if (!output) return { type: 'json', value: null };
        const { trace: _trace, ...content } = output;
        return { type: 'json', value: JSON.parse(JSON.stringify(content)) };
      },
    }),
  };
}
