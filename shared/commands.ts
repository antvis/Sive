import { z } from 'zod';
import type { API } from './contracts';
import { WorkbenchError } from './errors';
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
} from './input-schemas';

type Commands = Omit<API, 'onChange' | 'onTaskChange' | 'onModelTest'>;
type Command = keyof Commands;
export type CommandHandlers = {
  [K in Command]: (
    ...args: Parameters<Commands[K]>
  ) => ReturnType<Commands[K]> | Awaited<ReturnType<Commands[K]>>;
};
const none = z.tuple([]);
const oneId = z.tuple([idSchema]);
export const commandSchemas = {
  writeClipboard: z.tuple([z.string()]),
  state: none,
  run: oneId,
  importData: z.tuple([localFormatSchema.optional()]),
  cancel: none,
  createConversation: oneId,
  deleteConversation: oneId,
  restoreConversation: oneId,
  purgeConversations: z.tuple([z.array(idSchema).min(1)]),
  deleteData: oneId,
  reparseData: oneId,
  touchData: oneId,
  refreshMySQL: oneId,
  saveAnalysis: oneId,
  removeSavedAnalysis: oneId,
  renameSavedAnalysis: z.tuple([idSchema, requiredText()]),
  refreshSavedAnalysis: oneId,
  activateModel: z.tuple([idSchema, requiredText().optional()]),
  deleteModel: oneId,
  testMySQL: z.tuple([mysqlInputSchema]),
  saveMySQL: z.tuple([mysqlInputSchema]),
  saveTheme: z.tuple([themeSchema]),
  tableDetails: z.tuple([idSchema, requiredText()]),
  preview: z.tuple([idSchema, requiredText(), z.object({ offset: z.int(), limit: z.int() }).optional()]),
  semantic: z.tuple([idSchema, z.string(), z.array(businessMetricSchema).optional()]),
  analyze: z.tuple([
    idSchema,
    requiredText(),
    analysisModeSchema,
    idSchema.optional(),
    analysisOptionsSchema.optional(),
    idSchema.optional(),
  ]),
  chartHTML: z.tuple([idSchema, themeSchema.optional(), z.boolean().optional()]),
  exportAnalysis: z.tuple([idSchema, z.enum(['html', 'pdf', 'png']), z.boolean().optional()]),
  exportConversation: z.tuple([z.array(idSchema), idSchema.nullable(), z.enum(['html', 'md'])]),
  saveModel: z.tuple([modelInputSchema]),
  listModels: z.tuple([modelConnectionSchema]),
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
