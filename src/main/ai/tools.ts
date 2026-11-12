import { statSync } from 'node:fs';
import { tool } from 'ai';
import type { ToolSet } from 'ai';
import { z } from 'zod';
import type { AnalysisResponse, AVA, DataSourceConfig, Profile, Schema, Semantic } from '@antv/ava';

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
        if (context.sourceConfig.type === 'csv-file') {
          try {
            fileSize = statSync(context.sourceConfig.options.path).size;
          } catch {
            fileSize = undefined;
          }
        }
        return {
          name: context.name,
          sourceType: context.sourceType,
          rowCount: context.profile.models[0]?.metrics.row_count,
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
      execute: async () => (latest ? ava.visualize(latest) : null),
    }),
  };
}
