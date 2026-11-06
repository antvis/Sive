import { z } from 'zod';
import { businessMetricSchema } from '../shared/input-schemas';
import type { Workspace } from './store';

const record = z.record(z.string(), z.unknown());
const entity = z.looseObject({ id: z.string().min(1) });
const entities = <T extends z.ZodType<{ id: string }>>(schema: T) =>
  z.array(schema).refine((items) => new Set(items.map(({ id }) => id)).size === items.length);
const response = z.looseObject({
  data: z.array(record),
  schema: z.array(z.looseObject({ name: z.string() })),
});
const events = z.array(z.looseObject({ at: z.string(), stage: z.string(), label: z.string() }));
const chart = z.looseObject({ chartType: z.string(), config: record });
const metrics = z.array(businessMetricSchema).optional();
const connection = z.looseObject({
  host: z.string(),
  database: z.string(),
  user: z.string(),
  port: z.number().int(),
});
const dataset = entity
  .extend({
    name: z.string(),
    deletedAt: z.string().optional(),
    file: z.string(),
    fingerprint: z.string(),
    semantic: z.string(),
    createdAt: z.string(),
    format: z.enum(['csv', 'xlsx', 'json', 'parquet', 'mysql']),
    schema: z.looseObject({ models: z.array(z.looseObject({ name: z.string(), columns: z.array(record) })) }),
    profile: z.looseObject({ models: z.array(record) }),
    metrics,
    excelSheets: z.array(z.looseObject({ sheet: z.string(), header: z.boolean() })).optional(),
  })
  .refine((value) => value.format !== 'xlsx' || value.excelSheets !== undefined)
  .refine((value) => value.format !== 'mysql' || connection.safeParse(value.connection).success);
const run = entity.extend({
  datasetId: z.string(),
  sourceName: z.string(),
  fingerprint: z.string(),
  question: z.string(),
  strategy: z.string(),
  createdAt: z.string(),
  semantic: z.string(),
  modelName: z.string(),
  result: response,
  savedTitle: z.string().optional(),
  events,
  chart: chart.optional(),
  metrics,
  savedView: z.looseObject({ result: response, chart: chart.optional(), updatedAt: z.string() }).optional(),
});
const task = entity
  .extend({
    datasetId: z.string(),
    question: z.string(),
    events,
    status: z.enum(['running', 'cancelling', 'done', 'error', 'cancelled', 'interrupted']),
    preview: response.optional(),
  })
  .refine(
    (value) =>
      value.status !== 'done' || (typeof value.runId === 'string' && typeof value.finishedAt === 'string'),
  );

// Persisted data intentionally has a separate, backward-compatible schema.
// Validate without replacing objects: result identity is used by the storage reference cache.
export const workspaceSchema = z.looseObject({
  version: z.literal(2),
  activeModelId: z.string(),
  theme: z.looseObject({ mode: z.enum(['light', 'dark']) }),
  datasets: entities(dataset),
  runs: entities(run),
  tasks: entities(task),
  models: entities(
    entity.extend({
      name: z.string(),
      model: z.string(),
      baseURL: z.string(),
      modelIds: z.array(z.string()),
    }),
  ),
  conversations: entities(
    entity.extend({
      datasetId: z.string(),
      title: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
      deletedAt: z.string().optional(),
    }),
  ),
});
export function validateWorkspace(value: unknown): asserts value is Workspace {
  if (!workspaceSchema.safeParse(value).success) throw new Error('工作区数据结构无效');
}
