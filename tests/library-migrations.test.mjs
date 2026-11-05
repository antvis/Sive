import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { QueryObserver } from '@tanstack/react-query';
import {
  createTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table';
import { gridColumns } from '../src/shared/grid.ts';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  queryClient,
  previewQuery,
  tableDetailsQuery,
  runQuery,
  pruneWorkspaceQueries,
} from '../src/shared/queries.ts';
import {
  mysqlInputSchema,
  modelInputSchema,
  modelURLSchema,
  metricFormSchema,
} from '../shared/input-schemas.ts';
import { invokeCommand } from '../shared/commands.ts';
import { validateWorkspace } from '../backend/workspace-schema.ts';
import { WorkspaceStorage, WorkspaceLoadError } from '../backend/workspace-storage.ts';

const tick = () => new Promise((resolve) => setImmediate(resolve));
const source = { id: 'a', fingerprint: 'v1', schemaRevision: 's1', schema: { models: [{ name: 'orders' }] } };
const connection = { name: 'Local', host: '127.0.0.1', port: 3306, database: 'test', user: 'reader' };
const workspace = () => ({
  version: 2,
  activeModelId: '',
  theme: { mode: 'light' },
  datasets: [],
  models: [],
  runs: [],
  tasks: [],
  conversations: [],
});
const run = () => ({
  id: 'r',
  datasetId: 'a',
  sourceName: 'test',
  fingerprint: 'v1',
  question: 'test',
  strategy: 'direct',
  createdAt: '',
  semantic: '',
  modelName: 'test',
  result: { data: [], schema: [] },
  events: [],
});

test('queries deduplicate reads and isolate late page responses', async () => {
  const pending = [];
  globalThis.window = {
    workbench: { preview: (...args) => new Promise((resolve) => pending.push({ args, resolve })) },
  };
  const first = previewQuery(source, 'orders', 1, 100);
  const observer = new QueryObserver(queryClient, first);
  const unsubscribe = observer.subscribe(() => {});
  const same = queryClient.fetchQuery(first);
  assert.equal(pending.length, 1);
  assert.deepEqual(pending[0].args, ['a', 'orders', { offset: 0, limit: 101 }]);
  observer.setOptions(previewQuery(source, 'orders', 2, 100));
  pending[1].resolve([{ id: 'page2' }]);
  await tick();
  pending[0].resolve([{ id: 'page1' }]);
  await same;
  assert.deepEqual(observer.getCurrentResult().data, [{ id: 'page2' }]);
  unsubscribe();
  queryClient.clear();
});

test('failed reads require explicit retry; dataset and saved-view revisions invalidate keys', async () => {
  let calls = 0;
  globalThis.window = {
    workbench: {
      run: async () => {
        if (++calls === 1) throw new Error('offline');
        return run();
      },
    },
  };
  const options = runQuery({ id: 'r' });
  await assert.rejects(queryClient.fetchQuery(options), /offline/);
  assert.equal(calls, 1);
  await queryClient.fetchQuery(options);
  await queryClient.fetchQuery(runQuery({ id: 'r', savedTitle: 'renamed' }));
  assert.equal(calls, 2);
  await queryClient.fetchQuery(runQuery({ id: 'r', viewUpdatedAt: 'v2' }));
  assert.equal(calls, 3);
  assert.notDeepEqual(
    previewQuery(source, 'orders', 1, 100).queryKey,
    previewQuery({ ...source, fingerprint: 'v2' }, 'orders', 1, 100).queryKey,
  );
  assert.notDeepEqual(
    tableDetailsQuery(source, 'orders').queryKey,
    tableDetailsQuery({ ...source, schemaRevision: 's2' }, 'orders').queryKey,
  );
  assert.equal(tableDetailsQuery(source, 'missing').enabled, false);
  pruneWorkspaceQueries({ datasets: [], runs: [] });
  assert.equal(queryClient.getQueryCache().getAll().length, 0);
  queryClient.clear();
});

test('IPC schemas preserve optional tuples and password omission versus explicit clearing', () => {
  const handlers = { importData: (...args) => args, saveMySQL: (input) => input, analyze: (...args) => args };
  assert.deepEqual(invokeCommand(handlers, 'importData', []), []);
  assert.deepEqual(invokeCommand(handlers, 'importData', ['csv']), ['csv']);
  assert.throws(() => invokeCommand(handlers, 'importData', ['csv', 'extra']));
  assert.equal(invokeCommand(handlers, 'saveMySQL', [connection]).password, undefined);
  assert.equal(invokeCommand(handlers, 'saveMySQL', [{ ...connection, password: '' }]).password, '');
  assert.equal(
    invokeCommand(handlers, 'analyze', ['a', 'question', 'direct', undefined, undefined, 'chat'])[5],
    'chat',
  );
  assert.throws(() =>
    invokeCommand(handlers, 'analyze', ['a', 'question', 'direct', undefined, { maxRetries: 1.5 }]),
  );
  for (const patch of [
    { port: 0 },
    { port: 65536 },
    { port: 1.2 },
    { host: 'a b' },
    { password: "a'b" },
    { user: '' },
  ])
    assert.equal(mysqlInputSchema.safeParse({ ...connection, ...patch }).success, false);
});

test('shared form schemas enforce model URL, model selection, metrics and field errors', async () => {
  for (const url of [
    'https://api.example.com/v1',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://[::1]:8000',
  ])
    assert.equal(modelURLSchema.safeParse(url).success, true);
  for (const url of [
    'no url',
    'http://remote.example.com',
    'https://user:pass@example.com',
    'https://example.com?key=secret',
    'https://platform.deepseek.com',
  ])
    assert.equal(modelURLSchema.safeParse(url).success, false);
  assert.equal(
    modelInputSchema.safeParse({ name: 'a', baseURL: 'https://api.example.com', modelIds: [] }).success,
    false,
  );
  assert.equal(
    metricFormSchema.safeParse({ name: 'x', table: '', expression: 'SUM(a)', unit: '', description: '' })
      .success,
    false,
  );
  const result = await zodResolver(mysqlInputSchema)(
    { ...connection, port: null },
    {},
    { criteriaMode: 'firstError', fields: {}, shouldUseNativeValidation: false },
  );
  assert.ok(result.errors.port);
  assert.equal(result.errors.host, undefined);
});

test('workspace validation retains legacy fields and identity, rejects broken entities', () => {
  const value = workspace();
  const result = run();
  result.futureField = { keep: true };
  value.runs.push(result);
  validateWorkspace(value);
  assert.equal(value.runs[0], result);
  assert.deepEqual(value.runs[0].futureField, { keep: true });
  assert.throws(() => validateWorkspace({ ...value, runs: [result, result] }));
  assert.throws(() =>
    validateWorkspace({
      ...value,
      tasks: [{ id: 't', datasetId: 'a', question: 'q', events: [], status: 'done' }],
    }),
  );
  assert.throws(() => validateWorkspace({ ...value, version: 3 }));
});

test('storage still saves, reloads and recovers the previous manifest', () => {
  const root = mkdtempSync(join(tmpdir(), 'sive-schema-'));
  try {
    const storage = new WorkspaceStorage(root);
    const value = workspace();
    value.runs.push(run());
    storage.save(value);
    storage.save({ ...value, activeModelId: 'new' });
    assert.equal(new WorkspaceStorage(root).load().activeModelId, 'new');
    writeFileSync(join(root, 'workspace.json'), 'corrupt');
    const damaged = new WorkspaceStorage(root);
    assert.throws(
      () => damaged.load(),
      (error) => error instanceof WorkspaceLoadError && error.canRecover,
    );
    damaged.recover();
    assert.equal(damaged.load().activeModelId, '');
    assert.equal(damaged.load().runs[0].id, 'r');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function grid(data, manualPagination = false) {
  const fields = [{ name: 'amount.total' }, { name: 'label' }];
  const columns = (sorting) => gridColumns(fields, [140, 200], new Set(['amount.total']), sorting);
  let state;
  const table = createTable({
    data,
    columns: columns([]),
    renderFallbackValue: null,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination,
    autoResetPageIndex: false,
    enableMultiSort: false,
    onStateChange: (updater) => {
      state = typeof updater === 'function' ? updater(state) : updater;
      table.setOptions((previous) => ({ ...previous, state, columns: columns(state.sorting) }));
    },
  });
  state = { ...table.initialState, pagination: { pageIndex: 0, pageSize: 2 } };
  table.setOptions((previous) => ({ ...previous, state }));
  return table;
}

test('table sorting preserves exact decimal values, dotted names and nulls last in both directions', () => {
  const table = grid(
    [
      { 'amount.total': null },
      { 'amount.total': '9007199254740993' },
      { 'amount.total': '-1.00000000000000001' },
      { 'amount.total': '9007199254740992' },
      { 'amount.total': undefined },
      { 'amount.total': '1e-20' },
    ],
    true,
  );
  const values = () => table.getRowModel().rows.map((row) => row.getValue('amount.total'));
  const column = table.getColumn('amount.total');
  column.toggleSorting();
  assert.deepEqual(values(), [
    '-1.00000000000000001',
    '1e-20',
    '9007199254740992',
    '9007199254740993',
    null,
    undefined,
  ]);
  column.toggleSorting();
  assert.deepEqual(values(), [
    '9007199254740993',
    '9007199254740992',
    '1e-20',
    '-1.00000000000000001',
    null,
    undefined,
  ]);
  column.toggleSorting();
  assert.equal(table.getState().sorting.length, 0);
  assert.equal(values()[0], null);
  assert.equal(table.getColumn('label').getCanSort(), false);
});

test('table pagination and column sizing keep local and server-paged modes distinct', () => {
  const data = [3, 1, 2].map((value) => ({ 'amount.total': value }));
  const table = grid(data);
  assert.equal(table.getRowModel().rows.length, 2);
  table.setPageIndex(1);
  assert.equal(table.getRowModel().rows.length, 1);
  assert.equal(grid(data, true).getRowModel().rows.length, 3);
  const column = table.getColumn('amount.total');
  table.setColumnSizing({ 'amount.total': 40, label: 260 });
  assert.equal(column.getSize(), 80);
  table.setColumnSizing({ 'amount.total': 2000, label: 260 });
  assert.equal(column.getSize(), 1000);
  column.resetSize();
  assert.equal(column.getSize(), 140);
  assert.equal(table.getColumn('label').getSize(), 260);
  table.resetColumnSizing();
  assert.equal(table.getColumn('label').getSize(), 200);
});
