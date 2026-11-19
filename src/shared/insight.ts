import { z } from 'zod';

export const insightPresentationSchema = z.object({
  intent: z.string().trim().min(1).max(16),
  tags: z.array(z.string().trim().min(1).max(16)).max(2),
  summaryT8: z.string().min(1),
  titleHighlights: z.array(z.string().min(1).max(64)).max(3),
});

export type InsightPresentation = z.infer<typeof insightPresentationSchema>;

export function readInsightPresentation(value: unknown) {
  const result = insightPresentationSchema.safeParse(value);
  if (!result.success) return undefined;
  return { ...result.data, tags: [...new Set(result.data.tags)] };
}
