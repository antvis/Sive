import { statSync } from 'node:fs';
import { tool } from 'ai';
import type { LanguageModel, ToolSet } from 'ai';
import { z } from 'zod';
import type {
  AnalysisResponse,
  AnalysisStrategyConfig,
  AVA,
  DataSourceConfig,
  Profile,
  Schema,
  Semantic,
} from '@antv/ava';
import { localFilePath } from '../util/localFile';
import { generateInsightPresentation } from './snippet-agent';

export type ToolContext = {
  name: string;
  sourceType: DataSourceConfig['type'];
  sourceConfig: DataSourceConfig;
  schema: Schema;
  profile: Profile;
  semantic: Semantic;
};

export function createTools(
  ava: AVA,
  context: ToolContext,
  options: { strategy: AnalysisStrategyConfig; question: string },
  model: LanguageModel,
): ToolSet {
  let latest: AnalysisResponse | undefined;

  return {
    source: tool({
      description: 'Load the configured dataset. The system runs this before the first analysis.',
      inputSchema: z.object({}),
      execute: async () => {
        await ava.source(context.sourceConfig);
        let fileSize: number | undefined;
        const file = localFilePath(context.sourceConfig);
        if (file) {
          try {
            fileSize = statSync(file).size;
          } catch {
            fileSize = undefined;
          }
        }
        return {
          name: context.name,
          sourceType: context.sourceType,
          rowCount: context.profile.models.find((model) => model.name === context.schema.models[0]?.name)
            ?.metrics.row_count,
          columnCount: context.schema.models[0]?.columns.length ?? 0,
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
      execute: () => ava.semantic({}, () => context.semantic),
    }),
    analyze: tool({
      description: 'Analyze the loaded dataset and return the actual query, SQL, text conclusion and rows.',
      inputSchema: z.object({ query: z.string().min(1) }),
      execute: async ({ query }) => {
        latest = await ava.analyze(query, { strategy: options.strategy });
        return latest;
      },
    }),
    visualize: tool({
      description: 'Create a visualization for the latest analysis result. Call analyze first.',
      inputSchema: z.object({}),
      execute: async (_input, { abortSignal }) => {
        if (!latest) return null;
        const analysis = latest;
        const visualization = await ava.visualize(analysis);
        if (!visualization) return null;
        const presentation = await generateInsightPresentation({
          model,
          question: options.question,
          query: analysis.query,
          summary: analysis.text,
          spec: visualization.config,
          abortSignal,
        });
        return {
          question: analysis.query,
          summary: analysis.text,
          spec: visualization.config,
          presentation,
        };
      },
    }),
  };
}
