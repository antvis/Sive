import { WorkbenchError } from '../shared/errors';
import fs from 'node:fs';
import path from 'node:path';
import type { Conversation, Dataset, Run, ModelProfile, State, Task } from '../shared/contracts';
import { randomUUID } from 'node:crypto';
import { defaultTheme, validateTheme, type ThemeSettings } from '../shared/theme';
import { WorkspaceStorage } from './workspace-storage';
export type StoredModel = Omit<ModelProfile, 'hasKey'> & { encryptedKey?: string; revision?: number };
export type StoredDataset = Dataset & { file: string; encryptedPassword?: string; revision?: number };
export type Workspace = {
  version: 2;
  datasets: StoredDataset[];
  runs: Run[];
  models: StoredModel[];
  activeModelId: string;
  lastImportDirectory?: string;
  theme: ThemeSettings;
  tasks: Task[];
  conversations: Conversation[];
};
export class Store {
  private data: Workspace;
  private storage: WorkspaceStorage;
  get view() {
    return {
      models: structuredClone(this.data.models),
      conversations: this.data.conversations.map((conversation) => ({ ...conversation })),
      activeModelId: this.data.activeModelId,
      lastImportDirectory: this.data.lastImportDirectory,
    };
  }
  theme() {
    return structuredClone(this.data.theme);
  }
  constructor(public root: string) {
    fs.mkdirSync(path.join(root, 'sources'), { recursive: true, mode: 0o700 });
    this.storage = new WorkspaceStorage(root);
    const loaded = this.storage.load();
    this.data = loaded ?? {
      version: 2,
      datasets: [],
      runs: [],
      models: [],
      activeModelId: '',
      tasks: [],
      conversations: [],
      theme: structuredClone(defaultTheme),
    };
    let interrupted = false;
    try {
      const progress: Task = JSON.parse(fs.readFileSync(path.join(root, 'task-progress.json'), 'utf8'));
      const task = this.data.tasks.find((item) => item.id === progress.id);
      if (
        task &&
        ['running', 'cancelling'].includes(task.status) &&
        ['running', 'cancelling'].includes(progress.status) &&
        task.datasetId === progress.datasetId &&
        task.conversationId === progress.conversationId &&
        Array.isArray(progress.events)
      ) {
        Object.assign(task, progress);
      }
    } catch {
      // A missing or incomplete checkpoint cannot prevent recovery of the durable workspace.
    }
    for (const task of this.data.tasks) {
      if (task.status === 'running' || task.status === 'cancelling') {
        task.status = 'interrupted';
        task.error = '应用退出导致任务中断，可重新发起分析。';
        task.finishedAt = new Date().toISOString();
        interrupted = true;
      }
    }
    if (!loaded || interrupted) this.save();
    this.storage.collectUnusedResults();
    this.clearTaskProgress();
  }
  save() {
    this.storage.save(this.data);
  }
  saveTaskProgress(task: Task) {
    const file = path.join(this.root, 'task-progress.json');
    fs.writeFileSync(file + '.tmp', JSON.stringify(task), { mode: 0o600 });
    fs.renameSync(file + '.tmp', file);
  }
  clearTaskProgress() {
    try {
      fs.rmSync(path.join(this.root, 'task-progress.json'), { force: true });
    } catch {
      // A stale checkpoint is ignored once the workspace task is terminal or absent.
    }
  }
  publicState(task: Task | null): State {
    const deleted = new Set(this.data.conversations.filter((c) => c.deletedAt).map((c) => c.id));
    return structuredClone({
      conversations: this.data.conversations.filter((c) => !c.deletedAt),
      deletedConversations: this.data.conversations.filter((c) => c.deletedAt),
      runs: this.data.runs
        .filter((run) => !deleted.has(run.conversationId || ''))
        .map(
          ({
            id,
            conversationId,
            datasetId,
            sourceName,
            question,
            strategy,
            analysisOptions,
            parentId,
            createdAt,
            savedAt,
            savedTitle,
            modelName,
            savedView,
          }) => ({
            id,
            conversationId,
            datasetId,
            sourceName,
            question,
            strategy,
            analysisOptions,
            parentId,
            createdAt,
            savedAt,
            savedTitle,
            modelName,
            viewUpdatedAt: savedView?.updatedAt,
          }),
        ),
      activeModelId: this.data.activeModelId,
      tasks: this.data.tasks
        .filter((entry) => !deleted.has(entry.conversationId || ''))
        .map((entry) => (entry.id === task?.id ? task : entry)),
      theme: this.data.theme,
      datasets: this.data.datasets.map(({ file, encryptedPassword, revision, ...d }) => d),
      models: this.data.models.map(({ id, name, model, modelIds, baseURL, testedAt, encryptedKey }) => ({
        id,
        name,
        model,
        modelIds,
        baseURL,
        testedAt,
        hasKey: !!encryptedKey,
      })),
      task: task && !deleted.has(task.conversationId || '') ? task : null,
    });
  }
  dataset(id: string) {
    const d = this.data.datasets.find((d) => d.id === id);
    if (!d) throw new WorkbenchError('CONFLICT', '数据不存在');
    return structuredClone(d);
  }
  taskRecord(id: string) {
    return structuredClone(this.data.tasks.find((task) => task.id === id));
  }
  private commit(patch: Partial<Workspace>) {
    const previous = this.data;
    this.data = { ...previous, ...patch };
    try {
      this.save();
    } catch {
      this.data = previous;
      throw new WorkbenchError('PERSISTENCE', '保存失败，请检查磁盘空间或目录权限；原数据已保留。');
    }
  }
  putDataset(next: StoredDataset, expected?: StoredDataset) {
    const current = this.data.datasets.find((entry) => entry.id === next.id);
    if (expected ? !current || (current.revision || 0) !== (expected.revision || 0) : !!current)
      throw new WorkbenchError('CONFLICT', '数据已被其他操作修改或移除，请重新打开后重试');
    const saved = { ...structuredClone(next), revision: (current?.revision || 0) + 1 };
    this.commit({ datasets: [saved, ...this.data.datasets.filter((entry) => entry.id !== next.id)] });
  }
  assertDatasetCurrent(expected: StoredDataset) {
    const current = this.data.datasets.find((entry) => entry.id === expected.id);
    if (!current || (current.revision || 0) !== (expected.revision || 0))
      throw new WorkbenchError('CONFLICT', '数据已被其他操作修改或移除，请重试');
  }
  saveTheme(theme: ThemeSettings) {
    this.commit({ theme: validateTheme(theme) });
  }
  rememberImportDirectory(directory: string) {
    this.commit({ lastImportDirectory: directory });
  }
  touchDataset(id: string) {
    this.dataset(id);
    this.commit({
      datasets: this.data.datasets.map((entry) =>
        entry.id === id ? { ...entry, lastUsedAt: new Date().toISOString() } : entry,
      ),
    });
  }
  startTask(task: Task, conversation: Conversation) {
    const first =
      !this.data.tasks.some((entry) => entry.conversationId === conversation.id) &&
      !this.data.runs.some((entry) => entry.conversationId === conversation.id);
    this.commit({
      tasks: [structuredClone(task), ...this.data.tasks].slice(0, 300),
      conversations: this.data.conversations.map((entry) =>
        entry.id === conversation.id
          ? {
              ...entry,
              title: first ? task.question.trim().slice(0, 60) : entry.title,
              updatedAt: task.startedAt!,
            }
          : entry,
      ),
    });
  }
  finishTask(task: Task, run?: Run) {
    this.commit({
      tasks: this.data.tasks.map((entry) => (entry.id === task.id ? structuredClone(task) : entry)),
      ...(run ? { runs: [structuredClone(run), ...this.data.runs] } : {}),
    });
  }
  saveView(id: string, savedAt: string, source: StoredDataset, view: NonNullable<Run['savedView']>) {
    this.assertDatasetCurrent(source);
    const run = this.data.runs.find((entry) => entry.id === id);
    if (!run || run.savedAt !== savedAt)
      throw new WorkbenchError('CONFLICT', '收藏的分析已移除或重新保存，本次刷新结果未写入');
    this.commit({
      runs: this.data.runs.map((entry) =>
        entry.id === id ? { ...entry, savedView: structuredClone(view) } : entry,
      ),
    });
  }
  saveModels(models: StoredModel[], activeModelId: string) {
    this.commit({ models: structuredClone(models), activeModelId });
  }
  createConversation(datasetId: string) {
    this.dataset(datasetId);
    const used = new Set([
      ...this.data.tasks.map((task) => task.conversationId),
      ...this.data.runs.map((run) => run.conversationId),
    ]);
    const empty = this.data.conversations.find(
      (conversation) =>
        conversation.datasetId === datasetId && !conversation.deletedAt && !used.has(conversation.id),
    );
    if (empty) return structuredClone(empty);
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: randomUUID(),
      datasetId,
      title: '新会话',
      createdAt: now,
      updatedAt: now,
    };
    this.commit({ conversations: [conversation, ...this.data.conversations] });
    return structuredClone(conversation);
  }
  deleteConversation(id: string) {
    if (!this.data.conversations.some((conversation) => conversation.id === id))
      throw new WorkbenchError('CONFLICT', '会话不存在');
    if (
      this.data.tasks.some(
        (task) => task.conversationId === id && ['running', 'cancelling'].includes(task.status),
      )
    )
      throw new WorkbenchError('CONFLICT', '请先停止此会话的分析');
    this.commit({
      conversations: this.data.conversations.map((conversation) =>
        conversation.id === id ? { ...conversation, deletedAt: new Date().toISOString() } : conversation,
      ),
    });
  }
  restoreConversation(id: string) {
    const conversation = this.data.conversations.find((c) => c.id === id && c.deletedAt);
    if (!conversation) throw new WorkbenchError('CONFLICT', '已删除会话不存在');
    this.dataset(conversation.datasetId);
    this.commit({
      conversations: this.data.conversations.map((c) => {
        if (c.id !== id) return c;
        const { deletedAt, ...restored } = c;
        return restored;
      }),
    });
  }
  purgeConversations(ids: string[]) {
    const selected = new Set(ids);
    if (ids.some((id) => !this.data.conversations.some((c) => c.id === id && c.deletedAt)))
      throw new WorkbenchError('CONFLICT', '只能永久删除已移除的会话');
    this.commit({
      conversations: this.data.conversations.filter((c) => !selected.has(c.id)),
      runs: this.data.runs.filter((run) => !selected.has(run.conversationId || '')),
      tasks: this.data.tasks.filter((task) => !selected.has(task.conversationId || '')),
    });
    this.storage.collectUnusedResults();
  }
  deleteDataset(id: string) {
    const dataset = this.dataset(id);
    // Only remove the managed copy, never a path outside the sources directory.
    if (
      dataset.format !== 'mysql' &&
      path.dirname(path.resolve(dataset.file)) !== path.resolve(this.root, 'sources')
    )
      throw new WorkbenchError('CONFLICT', '数据副本路径无效，无法删除');
    const previous = this.data;
    this.data = {
      ...previous,
      datasets: previous.datasets.filter((d) => d.id !== id),
      conversations: previous.conversations.filter((c) => c.datasetId !== id),
      runs: previous.runs.filter((r) => r.datasetId !== id),
      tasks: previous.tasks.filter((t) => t.datasetId !== id),
    };
    try {
      this.save();
    } catch (error) {
      this.data = previous;
      throw error;
    }
    try {
      if (dataset.format !== 'mysql') fs.rmSync(dataset.file, { force: true });
    } catch (error) {
      this.data = previous;
      this.save();
      throw error;
    }
    this.storage.collectUnusedResults();
  }
  run(id: string) {
    return structuredClone(this.storedRun(id));
  }
  private storedRun(id: string) {
    const r = this.data.runs.find((r) => r.id === id);
    if (!r) throw new WorkbenchError('CONFLICT', '分析结果不存在');
    return r;
  }
  saveAnalysis(id: string) {
    const run = this.storedRun(id);
    if (run.savedAt) return;
    this.commit({
      runs: this.data.runs.map((entry) =>
        entry.id === id ? { ...entry, savedAt: new Date().toISOString() } : entry,
      ),
    });
  }
  removeSavedAnalysis(id: string) {
    const run = this.storedRun(id);
    this.commit({
      runs: this.data.runs.map((entry) => {
        if (entry.id !== run.id) return entry;
        const { savedAt, savedTitle, savedView, ...rest } = entry;
        return rest;
      }),
    });
  }
  renameSavedAnalysis(id: string, title: string) {
    const run = this.storedRun(id);
    if (!run.savedAt) throw new WorkbenchError('CONFLICT', '此分析已从收藏移除');
    const savedTitle = title.trim();
    if (!savedTitle) throw new WorkbenchError('INVALID_INPUT', '请输入收藏标题');
    this.commit({
      runs: this.data.runs.map((entry) => (entry.id === id ? { ...entry, savedTitle } : entry)),
    });
  }
}
