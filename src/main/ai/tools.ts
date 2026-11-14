import { statSync } from 'node:fs';
import { tool } from 'ai';
import type { ToolSet } from 'ai';
import { z } from 'zod';
import type { AnalysisResponse, AVA, DataSourceConfig, Profile, Schema, Semantic } from '@antv/ava';
import { localFilePath } from '../util/localFile';

export type ToolContext = {
  name: string;
  sourceType: DataSourceConfig['type'];
  sourceConfig: DataSourceConfig;
  schema: Schema;
  profile: Profile;
  semantic: Semantic;
};

export function createTools(ava: AVA, context: ToolContext): ToolSet {
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
        latest = await ava.analyze(query);
        return latest;
      },
    }),
    visualize: tool({
      description: 'Create a visualization for the latest analysis result. Call analyze first.',
      inputSchema: z.object({}),
      execute: async () => {
        if (!latest) return null;
        const analysis = latest;
        const visualization = await ava.visualize(analysis);
        if (!visualization) return null;
        return {
          ...visualization,
          question: analysis.query,
          summary: analysis.text,
          spec: visualization.config,
        };
      },
    }),
  };
}
