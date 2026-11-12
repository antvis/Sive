import { tool } from 'ai';
import type { ToolSet } from 'ai';
import { z } from 'zod';
import type { AnalysisResponse, AVA } from '@antv/ava';

export function createTools(ava: AVA): ToolSet {
  let latest: AnalysisResponse | undefined;

  return {
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
