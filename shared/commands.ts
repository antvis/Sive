import type { API } from './contracts';
import { WorkbenchError } from './errors';
type Commands = Omit<API, 'onChange' | 'onTaskChange' | 'onModelTest'>;
type Command = keyof Commands;
export type CommandHandlers = {
  [K in Command]: (
    ...args: Parameters<Commands[K]>
  ) => ReturnType<Commands[K]> | Awaited<ReturnType<Commands[K]>>;
};
const text = (value: unknown, empty = false): value is string =>
  typeof value === 'string' && (empty || value.trim().length > 0);
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const optional = (value: unknown, check: (value: unknown) => boolean) => value === undefined || check(value);
const none = (args: unknown[]) => args.length === 0;
const oneId = (args: unknown[]) => args.length === 1 && text(args[0]);
const mysql = (args: unknown[]) => {
  const input = args[0];
  return (
    args.length === 1 &&
    record(input) &&
    ['name', 'host', 'database', 'user'].every((key) => text(input[key])) &&
    Number.isInteger(input.port) &&
    optional(input.id, text) &&
    optional(input.password, (value) => text(value, true))
  );
};
const guards = {
  writeClipboard: (a) => a.length === 1 && text(a[0], true),
  state: none,
  run: oneId,
  importData: none,
  cancel: none,
  createConversation: oneId,
  deleteConversation: oneId,
  restoreConversation: oneId,
  purgeConversations: (a) =>
    a.length === 1 && Array.isArray(a[0]) && a[0].length > 0 && a[0].every((id) => text(id)),
  deleteData: oneId,
  reparseData: oneId,
  touchData: oneId,
  refreshMySQL: oneId,
  saveAnalysis: oneId,
  removeSavedAnalysis: oneId,
  renameSavedAnalysis: (a) => a.length === 2 && text(a[0]) && text(a[1]),
  refreshSavedAnalysis: oneId,
  activateModel: (a) => a.length >= 1 && a.length <= 2 && text(a[0]) && optional(a[1], text),
  deleteModel: oneId,
  testMySQL: mysql,
  saveMySQL: mysql,
  saveTheme: (a) => a.length === 1 && record(a[0]),
  tableDetails: (a) => a.length === 2 && text(a[0]) && text(a[1]),
  preview: (a) =>
    a.length >= 2 &&
    a.length <= 3 &&
    text(a[0]) &&
    text(a[1]) &&
    optional(
      a[2],
      (value) => record(value) && Number.isSafeInteger(value.offset) && Number.isSafeInteger(value.limit),
    ),
  semantic: (a) =>
    a.length >= 2 &&
    a.length <= 3 &&
    text(a[0]) &&
    text(a[1], true) &&
    optional(
      a[2],
      (value) =>
        Array.isArray(value) &&
        value.every(
          (metric) =>
            record(metric) &&
            ['name', 'table', 'expression', 'unit', 'description'].every((key) => text(metric[key], true)),
        ),
    ),
  analyze: (a) =>
    a.length >= 3 &&
    a.length <= 6 &&
    text(a[0]) &&
    text(a[1]) &&
    ['direct', 'loop'].includes(String(a[2])) &&
    optional(a[3], text) &&
    optional(
      a[4],
      (value) =>
        record(value) &&
        ['maxRetries', 'maxSteps'].every((key) => optional(value[key], Number.isSafeInteger)),
    ) &&
    optional(a[5], text),
  chartHTML: (a) =>
    a.length >= 1 &&
    a.length <= 3 &&
    text(a[0]) &&
    optional(a[1], record) &&
    optional(a[2], (value) => typeof value === 'boolean'),
  exportAnalysis: (a) => a.length === 2 && text(a[0]) && ['html', 'pdf', 'png'].includes(String(a[1])),
  exportConversation: (a) =>
    a.length === 3 &&
    Array.isArray(a[0]) &&
    a[0].every((id) => text(id)) &&
    (a[1] === null || text(a[1])) &&
    ['html', 'md'].includes(String(a[2])),
  saveModel: (a) =>
    a.length === 1 &&
    record(a[0]) &&
    text(a[0].name) &&
    Array.isArray(a[0].modelIds) &&
    a[0].modelIds.length > 0 &&
    a[0].modelIds.every((id) => text(id)) &&
    text(a[0].baseURL) &&
    optional(a[0].id, text) &&
    optional(a[0].credentialSourceId, text) &&
    optional(a[0].apiKey, (value) => text(value, true)),
  listModels: (a) =>
    a.length === 1 &&
    record(a[0]) &&
    text(a[0].baseURL) &&
    optional(a[0].credentialSourceId, text) &&
    optional(a[0].apiKey, (value) => text(value, true)),
} satisfies Record<Command, (args: unknown[]) => boolean>;
export const commandNames = Object.keys(guards) as Command[];
function commandArgs<K extends Command>(name: K, args: unknown[]): Parameters<Commands[K]> {
  if (!guards[name](args)) throw new WorkbenchError('INVALID_INPUT', '请求参数无效，请检查输入后重试。');
  return args as Parameters<Commands[K]>;
}
export function invokeCommand<K extends Command>(handlers: CommandHandlers, name: K, args: unknown[]) {
  return handlers[name](...commandArgs(name, args));
}
