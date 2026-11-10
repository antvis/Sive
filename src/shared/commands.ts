import { z } from 'zod';
import type { API } from '@shared/contracts';
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

type Commands = Omit<API, 'workspaceOnChange' | 'analysisOnTaskChange' | 'modelOnTestProgress'>;
type Command = keyof Commands;
export type CommandHandlers = {
  [K in Command]: (
    ...args: Parameters<Commands[K]>
  ) => ReturnType<Commands[K]> | Awaited<ReturnType<Commands[K]>>;
};
const none = z.tuple([]);
const oneId = z.tuple([idSchema]);
const commandSchemas = {
  clipboardWrite: z.tuple([z.string()]),
  workspaceGetState: none,
  analysisGetRun: oneId,
  datasetImport: z.tuple([localFormatSchema.optional()]),
  analysisCancel: oneId,
  conversationCreate: oneId,
  conversationArchive: oneId,
  conversationRestore: oneId,
  conversationPurge: z.tuple([z.array(idSchema).min(1)]),
  datasetDelete: oneId,
  datasetRename: z.tuple([idSchema, requiredText('请填写连接名称')]),
  datasetRelocate: oneId,
  datasetReparse: oneId,
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
} satisfies { [K in Command]: z.ZodType<Parameters<Commands[K]>> };
export const commandNames = Object.keys(commandSchemas) as Command[];
function commandArgs<K extends Command>(name: K, args: unknown[]): Parameters<Commands[K]> {
  const result = commandSchemas[name].safeParse(args);
  if (!result.success) throw new WorkbenchError('INVALID_INPUT', '请求参数无效，请检查输入后重试。');
  return result.data as Parameters<Commands[K]>;
}
export function invokeCommand<K extends Command>(handlers: CommandHandlers, name: K, args: unknown[]) {
  return handlers[name](...commandArgs(name, args));
}
