import { z } from 'zod';
import type { Command, Commands } from '@shared/commands';
import { WorkbenchError } from '@shared/errors';
import {
  idSchema,
  requiredText,
  mysqlInputSchema,
  modelInputSchema,
  modelConnectionSchema,
  businessMetricSchema,
  analysisModeSchema,
  analysisOptionsSchema,
  localFormatSchema,
  themeSchema,
} from '@shared/inputSchemas';

export type CommandHandlers = {
  [K in Command]: (
    ...args: Parameters<Commands[K]>
  ) => ReturnType<Commands[K]> | Awaited<ReturnType<Commands[K]>>;
};
const none = z.tuple([]);
const oneId = z.tuple([idSchema]);
const commandSchemas: { [K in Command]: z.ZodType<Parameters<Commands[K]>> } = {
  clipboardWrite: z.tuple([z.string()]),
  workspaceGetState: none,
  analysisGetRun: oneId,
  datasetImport: z.tuple([localFormatSchema.optional()]),
  analysisCancel: oneId,
  conversationCreate: oneId,
  conversationRename: z.tuple([idSchema, requiredText('请输入任务标题')]),
  conversationArchive: oneId,
  conversationRestore: oneId,
  conversationPurge: z.tuple([z.array(idSchema).min(1)]),
  datasetDelete: oneId,
  datasetRename: z.tuple([idSchema, requiredText('请填写连接名称')]),
  datasetRelocate: oneId,
  datasetRefreshMySQL: oneId,
  snippetSave: oneId,
  snippetRemove: oneId,
  snippetRename: z.tuple([idSchema, requiredText()]),
  snippetRefresh: oneId,
  modelActivate: z.tuple([idSchema, requiredText().optional()]),
  modelDelete: oneId,
  datasetTestMySQL: z.tuple([mysqlInputSchema]),
  datasetSaveMySQL: z.tuple([mysqlInputSchema]),
  settingsSaveTheme: z.tuple([themeSchema]),
  datasetGetTableDetails: z.tuple([idSchema, requiredText()]),
  datasetSuggest: z.tuple([idSchema, idSchema]),
  datasetCancelSuggestions: oneId,
  datasetPreview: z.tuple([
    idSchema,
    requiredText(),
    z.object({ offset: z.int(), limit: z.int() }).optional(),
  ]),
  datasetSaveSemantic: z.tuple([idSchema, z.string(), z.array(businessMetricSchema).optional()]),
  analysisStart: z.tuple([
    idSchema,
    requiredText(),
    analysisModeSchema,
    analysisOptionsSchema.optional(),
    idSchema.optional(),
  ]),
  analysisGetChartHTML: z.tuple([
    idSchema,
    themeSchema.optional(),
    z.boolean().optional(),
    z.int().min(0).optional(),
  ]),
  analysisExport: z.tuple([idSchema, z.enum(['html', 'pdf', 'png']), z.boolean().optional()]),
  modelSave: z.tuple([modelInputSchema]),
  modelListAvailable: z.tuple([modelConnectionSchema]),
};

function commandArgs<K extends Command>(name: K, args: unknown[]): Parameters<Commands[K]> {
  const schema: z.ZodType<Parameters<Commands[K]>> = commandSchemas[name];
  const result = schema.safeParse(args);
  if (!result.success) throw new WorkbenchError('INVALID_INPUT', '请求参数无效，请检查输入后重试。');
  return result.data;
}

export function invokeCommand<K extends Command>(handlers: CommandHandlers, name: K, args: unknown[]) {
  return handlers[name](...commandArgs(name, args));
}
