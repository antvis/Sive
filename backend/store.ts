import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import type { Conversation, Dataset, Run, RunSummary, State, Task } from '../shared/contracts';
import { WorkbenchError } from '../shared/errors';
import { defaultTheme, validateTheme, type ThemeSettings } from '../shared/theme';
import { SQLiteDatabase } from './sqlite-database';
import {
  parseJSON,
  conversationRecord,
  taskRecord,
  sourceSnapshot,
  analysisOptions,
  type StoredDataset,
  type StoredModel,
  type SourceConfig,
  type DatasetRow,
  type ModelRow,
  type ConversationRow,
  type MessageRow,
  type MessageOptions,
  type MessageContent,
  type AnalysisOutput,
  type SnippetRow,
  type SnippetContent,
} from './store-records';
export type { StoredDataset, StoredModel } from './store-records';

const messageFrom = `FROM messages m
  JOIN conversations c ON c.id = m.conversation_id
  JOIN messages u ON u.conversation_id = m.conversation_id AND u.sequence = m.sequence - 1 AND u.role = 'user'
  WHERE m.role = 'assistant' AND m.deleted_at IS NULL`;
const messageColumns = `m.*, c.dataset_id, json_extract(u.content, '$.text') AS question`;
const active = (status: Task['status']) => status === 'running' || status === 'cancelling';
const conflict = (message: string): never => {
  throw new WorkbenchError('CONFLICT', message);
};
// Keep modification times distinct for UI cache invalidation even within one millisecond.
const timestamp = (previous?: string) =>
  new Date(Math.max(Date.now(), previous ? Date.parse(previous) + 1 : 0)).toISOString();

export class Store {
  private db: SQLiteDatabase;
  constructor(root: string) {
    this.db = new SQLiteDatabase(root);
    try {
      const interrupted = this.db.all<MessageRow>(
        `SELECT ${messageColumns} ${messageFrom} AND m.status IN ('running', 'cancelling')`,
      );
      if (interrupted.length)
        this.db.transaction(() => {
          for (const row of interrupted)
            this.finishMessage({
              ...taskRecord(row),
              status: 'interrupted',
              error: '应用退出导致任务中断，可重新发起分析。',
            });
        });
    } catch (error) {
      this.close();
      throw error;
    }
  }
  close() {
    this.db.close();
  }

  private setting<T>(key: string): T | undefined {
    const row = this.db.get<{ value: string }>(
      'SELECT value FROM settings WHERE key = ? AND deleted_at IS NULL',
      key,
    );
    return row ? parseJSON<T>(row.value) : undefined;
  }
  private setSetting(key: string, value: unknown) {
    const now = timestamp();
    this.db.run(
      `INSERT INTO settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, deleted_at = NULL`,
      key,
      JSON.stringify(value),
      now,
      now,
    );
  }
  private get activeModel() {
    return this.setting<{ provider_id: string; model_name: string } | null>('active_model');
  }
  get activeModelId() {
    return this.activeModel?.provider_id || '';
  }
  models() {
    const selected = this.activeModel;
    return this.db
      .all<ModelRow>('SELECT * FROM model_providers WHERE deleted_at IS NULL ORDER BY created_at, id')
      .map((row) => {
        const modelIds = parseJSON<string[]>(row.model_names);
        return {
          id: row.id,
          name: row.name,
          baseURL: row.base_url,
          modelIds,
          model: selected?.provider_id === row.id ? selected.model_name : modelIds[0],
          encryptedKey: row.encrypted_key ?? undefined,
          updatedAt: row.updated_at,
        };
      });
  }
  private conversations() {
    return this.db
      .all<ConversationRow>('SELECT * FROM conversations ORDER BY created_at DESC, id DESC')
      .map(conversationRecord);
  }
  conversation(id: string) {
    const row = this.db.get<ConversationRow>('SELECT * FROM conversations WHERE id = ?', id);
    if (!row) return conflict('会话不存在');
    return conversationRecord(row);
  }
  get lastImportDirectory() {
    return this.setting<string>('last_import_directory');
  }
  theme() {
    return validateTheme(this.setting<ThemeSettings>('theme') ?? defaultTheme);
  }
  saveTheme(theme: ThemeSettings) {
    this.db.transaction(() => this.setSetting('theme', validateTheme(theme)));
  }
  rememberImportDirectory(directory: string) {
    this.db.transaction(() => this.setSetting('last_import_directory', directory));
  }

  private datasetRecord(row: DatasetRow): StoredDataset {
    const source = parseJSON<SourceConfig>(row.source_config);
    const fields = {
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at ?? undefined,
      schema: parseJSON<Dataset['schema']>(row.schema),
      profile: parseJSON<Dataset['profile']>(row.profile),
      semantic: row.semantic,
      metrics: row.metrics ? parseJSON<Dataset['metrics']>(row.metrics) : undefined,
    };
    if (row.source_type === 'mysql') {
      const connection = source.connection ?? {
        host: '',
        port: 3306,
        database: '',
        user: '',
        status: 'error' as const,
        hasPassword: false,
      };
      return {
        ...fields,
        format: 'mysql',
        file: '',
        connection: { ...connection, hasPassword: !!row.encrypted_credentials },
        encryptedCredentials: row.encrypted_credentials ?? undefined,
      };
    }
    if (!['csv', 'json', 'xlsx', 'parquet'].includes(row.source_type))
      throw new WorkbenchError('CONNECTION', `当前应用尚不支持此数据源类型：${row.source_type}`);
    return {
      ...fields,
      format: row.source_type as 'csv' | 'json' | 'xlsx' | 'parquet',
      file: source.path || '',
      excelSheets: source.excelSheets,
    };
  }
  publicDataset(dataset: StoredDataset): Dataset {
    const { file, encryptedCredentials, ...result } = dataset;
    return result;
  }
  dataset(id: string) {
    const row = this.db.get<DatasetRow>('SELECT * FROM datasets WHERE id = ?', id);
    if (!row) return conflict('数据不存在');
    if (row.deleted_at) return conflict('连接已删除，历史分析仍可查看和导出');
    return this.datasetRecord(row);
  }
  assertDatasetCurrent(expected: StoredDataset) {
    const current = this.db.get<{ updated_at: string }>(
      'SELECT updated_at FROM datasets WHERE id = ? AND deleted_at IS NULL',
      expected.id,
    );
    if (current?.updated_at !== expected.updatedAt) conflict('数据已被其他操作修改，请重新打开后重试');
  }
  putDataset(next: StoredDataset, expected?: StoredDataset) {
    return this.db.transaction(() => {
      if (expected) this.assertDatasetCurrent(expected);
      else if (this.db.get('SELECT id FROM datasets WHERE id = ?', next.id)) conflict('数据源已存在');
      const config = next.deletedAt ? {} : sourceSnapshot(next).config;
      if (!next.deletedAt && next.format !== 'mysql' && !next.file.trim()) conflict('请选择源文件');
      if (!next.deletedAt && next.format === 'xlsx' && !next.excelSheets) conflict('缺少 Excel 读取区域');
      const now = timestamp(expected?.updatedAt);
      this.db.run(
        `INSERT INTO datasets (id, name, source_type, source_config, schema, profile, semantic, metrics, encrypted_credentials, created_at, updated_at, deleted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name,
        source_type = excluded.source_type, source_config = excluded.source_config, schema = excluded.schema,
        profile = excluded.profile, semantic = excluded.semantic, metrics = excluded.metrics,
        encrypted_credentials = excluded.encrypted_credentials, updated_at = excluded.updated_at, deleted_at = excluded.deleted_at`,
        next.id,
        next.name,
        next.format,
        JSON.stringify(config),
        JSON.stringify(next.schema),
        JSON.stringify(next.profile),
        next.semantic,
        next.metrics ? JSON.stringify(next.metrics) : null,
        next.deletedAt ? null : (next.encryptedCredentials ?? null),
        expected?.createdAt ?? now,
        now,
        next.deletedAt ?? null,
      );
      return this.datasetRecord(this.db.get<DatasetRow>('SELECT * FROM datasets WHERE id = ?', next.id)!);
    });
  }
  deleteDataset(id: string) {
    const original = this.dataset(id);
    this.putDataset(
      { ...original, file: '', encryptedCredentials: undefined, deletedAt: timestamp() },
      original,
    );
  }

  saveModel(model: StoredModel, expected?: StoredModel) {
    this.db.transaction(() => {
      const current = this.models().find((entry) => entry.id === model.id);
      if (expected ? !current || !isDeepStrictEqual(current, expected) : !!current)
        conflict('模型已被修改或移除，请重新打开设置');
      const now = timestamp(current?.updatedAt);
      this.db.run(
        `INSERT INTO model_providers (id, name, model_names, base_url, encrypted_key, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name,
        model_names = excluded.model_names, base_url = excluded.base_url, encrypted_key = excluded.encrypted_key, updated_at = excluded.updated_at`,
        model.id,
        model.name,
        JSON.stringify(model.modelIds),
        model.baseURL,
        model.encryptedKey ?? null,
        now,
        now,
      );
      if (!this.activeModel || this.activeModel.provider_id === model.id)
        this.setSetting('active_model', { provider_id: model.id, model_name: model.model });
    });
  }
  activateModel(id: string, model: string) {
    this.db.transaction(() => {
      if (
        !this.models()
          .find((entry) => entry.id === id)
          ?.modelIds.includes(model)
      )
        conflict('模型不存在或未配置');
      this.setSetting('active_model', { provider_id: id, model_name: model });
    });
  }
  deleteModel(id: string) {
    this.db.transaction(() => {
      const now = timestamp();
      this.db.run(
        'UPDATE model_providers SET deleted_at = ?, updated_at = ?, encrypted_key = NULL WHERE id = ? AND deleted_at IS NULL',
        now,
        now,
        id,
      );
      if (this.activeModel?.provider_id === id) {
        const next = this.models()[0];
        this.setSetting('active_model', next ? { provider_id: next.id, model_name: next.modelIds[0] } : null);
      }
    });
  }

  createConversation(datasetId: string) {
    return this.db.transaction(() => {
      this.dataset(datasetId);
      const empty = this.db.get<ConversationRow>(
        `SELECT c.* FROM conversations c WHERE c.dataset_id = ? AND c.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id) ORDER BY c.created_at DESC LIMIT 1`,
        datasetId,
      );
      if (empty) return conversationRecord(empty);
      const now = timestamp();
      const row: ConversationRow = {
        id: randomUUID(),
        dataset_id: datasetId,
        title: '新会话',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      this.db.run(
        'INSERT INTO conversations (id, dataset_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        row.id,
        datasetId,
        row.title,
        now,
        now,
      );
      return conversationRecord(row);
    });
  }
  deleteConversation(id: string) {
    this.db.transaction(() => {
      if (!this.db.get('SELECT id FROM conversations WHERE id = ?', id)) conflict('会话不存在');
      if (
        this.db.get(
          "SELECT id FROM messages WHERE conversation_id = ? AND status IN ('running', 'cancelling')",
          id,
        )
      )
        conflict('请先停止此会话的分析');
      const now = timestamp();
      this.db.run('UPDATE conversations SET deleted_at = ?, updated_at = ? WHERE id = ?', now, now, id);
    });
  }
  restoreConversation(id: string) {
    this.db.transaction(() => {
      if (
        !this.db.run(
          'UPDATE conversations SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL',
          timestamp(),
          id,
        ).changes
      )
        conflict('已归档会话不存在');
    });
  }
  purgeConversations(ids: string[]) {
    this.db.transaction(() => {
      for (const id of ids) {
        if (!this.db.get('SELECT id FROM conversations WHERE id = ? AND deleted_at IS NOT NULL', id))
          conflict('只能永久删除已归档的会话');
      }
      for (const id of ids) this.db.run('DELETE FROM conversations WHERE id = ?', id);
    });
  }

  startTask(task: Task, conversation: Conversation, options: MessageOptions) {
    return this.db.transaction(() => {
      const current = this.db.get<ConversationRow>(
        'SELECT * FROM conversations WHERE id = ? AND deleted_at IS NULL',
        conversation.id,
      );
      if (!current || current.dataset_id !== task.datasetId || task.conversationId !== conversation.id)
        return conflict('会话不存在或不属于当前数据源');
      this.dataset(task.datasetId);
      if (
        this.db.get(
          "SELECT id FROM messages WHERE status IN ('running', 'cancelling') AND deleted_at IS NULL",
        )
      )
        conflict('已有分析正在进行');
      const sequence = this.db.get<{ next: number }>(
        'SELECT COALESCE(MAX(sequence) + 1, 0) AS next FROM messages WHERE conversation_id = ?',
        conversation.id,
      )!.next;
      const now = task.startedAt || timestamp();
      this.db.run(
        `INSERT INTO messages (id, conversation_id, sequence, role, status, content, analysis_options, created_at, updated_at)
        VALUES (?, ?, ?, 'user', 'done', ?, '{}', ?, ?)`,
        randomUUID(),
        conversation.id,
        sequence,
        JSON.stringify({ text: task.question }),
        now,
        now,
      );
      this.db.run(
        `INSERT INTO messages (id, conversation_id, sequence, role, status, content, analysis_options, created_at, updated_at)
        VALUES (?, ?, ?, 'assistant', 'running', ?, ?, ?, ?)`,
        task.id,
        conversation.id,
        sequence + 1,
        JSON.stringify({ events: [] }),
        JSON.stringify(options),
        now,
        now,
      );
      this.db.run(
        'UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?',
        sequence === 0 ? task.question.trim().slice(0, 60) : current.title,
        now,
        conversation.id,
      );
      return sequence + 1;
    });
  }
  private message(id: string) {
    const row = this.db.get<MessageRow>(`SELECT ${messageColumns} ${messageFrom} AND m.id = ?`, id);
    if (!row) return conflict('分析记录不存在');
    return row;
  }
  saveTaskProgress(task: Task) {
    this.db.transaction(() => {
      const row = this.message(task.id);
      if (!active(row.status)) return;
      const status = row.status === 'cancelling' ? 'cancelling' : task.status;
      if (!active(status)) conflict('无效的分析进度状态');
      this.db.run(
        'UPDATE messages SET status = ?, content = ?, updated_at = ? WHERE id = ?',
        status,
        JSON.stringify({
          events: task.events,
          preview: task.preview,
          persistence_error: task.persistenceError,
        }),
        timestamp(row.updated_at),
        task.id,
      );
    });
  }
  private finishMessage(task: Task, output?: AnalysisOutput) {
    const row = this.message(task.id);
    if (!active(row.status)) return;
    if (
      active(task.status) ||
      (task.status === 'done') !== !!output ||
      (task.status === 'done' && row.status !== 'running')
    )
      conflict('分析结束状态与结果不匹配');
    const content: MessageContent = output
      ? { result: output.result, chart: output.chart, chart_error: output.chartError, events: task.events }
      : { events: task.events, preview: task.preview, error: task.error };
    const now = timestamp(row.updated_at);
    this.db.run(
      'UPDATE messages SET status = ?, content = ?, updated_at = ? WHERE id = ?',
      task.status,
      JSON.stringify(content),
      now,
      task.id,
    );
    this.db.run('UPDATE conversations SET updated_at = ? WHERE id = ?', now, row.conversation_id);
    this.db.run(
      `INSERT INTO snippets (id, message_id, title, content, is_visible, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, ?)`,
      randomUUID(),
      task.id,
      row.question,
      JSON.stringify({
        result: content.result ?? content.preview,
        chart: content.chart,
        chart_error: content.chart_error,
        error: content.error,
      }),
      now,
      now,
    );
  }
  finishTask(task: Task, output?: AnalysisOutput) {
    this.db.transaction(() => this.finishMessage(task, output));
  }
  private snippet(id: string) {
    const row = this.db.get<SnippetRow>(
      'SELECT * FROM snippets WHERE message_id = ? AND deleted_at IS NULL',
      id,
    );
    if (!row) return conflict('分析片段不存在');
    return row;
  }
  latestRun(conversationId: string) {
    const row = this.db.get<{ id: string }>(
      `SELECT id FROM messages WHERE conversation_id = ? AND role = 'assistant'
      AND status = 'done' AND deleted_at IS NULL ORDER BY sequence DESC LIMIT 1`,
      conversationId,
    );
    return row ? this.run(row.id) : undefined;
  }
  assertRunSource(id: string, source: StoredDataset) {
    const old = parseJSON<MessageOptions>(this.message(id).analysis_options).source;
    const identity = (snapshot: typeof old) =>
      snapshot.format === 'mysql'
        ? {
            format: snapshot.format,
            host: snapshot.config.connection?.host,
            port: snapshot.config.connection?.port,
            database: snapshot.config.connection?.database,
            user: snapshot.config.connection?.user,
          }
        : { format: snapshot.format, path: snapshot.config.path, excelSheets: snapshot.config.excelSheets };
    if (!isDeepStrictEqual(identity(old), identity(sourceSnapshot(source))))
      conflict('数据来源或读取配置已变化，请开始新的分析');
  }
  run(id: string): Run {
    const row = this.message(id);
    const content = parseJSON<MessageContent>(row.content);
    if (row.status !== 'done' || !content.result) return conflict('分析尚未成功完成');
    const options = parseJSON<MessageOptions>(row.analysis_options);
    const snippet = this.snippet(id);
    const view = parseJSON<SnippetContent>(snippet.content);
    return {
      id,
      conversationId: row.conversation_id,
      datasetId: row.dataset_id,
      sequence: row.sequence,
      question: row.question,
      sourceName: options.source.name,
      excelSheets: options.source.config.excelSheets,
      strategy: options.analyze.strategy.type,
      analysisOptions: analysisOptions(options),
      createdAt: row.updated_at,
      semantic: options.semantic,
      metrics: options.metrics,
      modelName: `${options.model.provider_name} · ${options.model.model_name}`,
      result: content.result,
      chart: content.chart,
      chartError: content.chart_error,
      events: content.events,
      ...(snippet.is_visible
        ? {
            savedAt: snippet.updated_at,
            savedTitle: snippet.title,
            savedView: view.result
              ? { result: view.result, chart: view.chart ?? undefined, updatedAt: snippet.updated_at }
              : undefined,
          }
        : {}),
    };
  }
  saveAnalysis(id: string) {
    this.db.transaction(() => {
      if (this.message(id).status !== 'done') conflict('只能保存已完成的分析');
      const snippet = this.snippet(id);
      if (!snippet.is_visible)
        this.db.run(
          'UPDATE snippets SET is_visible = 1, updated_at = ? WHERE id = ?',
          timestamp(snippet.updated_at),
          snippet.id,
        );
    });
  }
  removeSavedAnalysis(id: string) {
    this.db.transaction(() => {
      const snippet = this.snippet(id);
      this.db.run(
        'UPDATE snippets SET is_visible = 0, updated_at = ? WHERE id = ?',
        timestamp(snippet.updated_at),
        snippet.id,
      );
    });
  }
  renameSavedAnalysis(id: string, title: string) {
    this.db.transaction(() => {
      const snippet = this.snippet(id);
      if (!snippet.is_visible) conflict('此分析已从收藏移除');
      if (!title.trim()) throw new WorkbenchError('INVALID_INPUT', '请输入收藏标题');
      this.db.run(
        'UPDATE snippets SET title = ?, updated_at = ? WHERE id = ?',
        title.trim(),
        timestamp(snippet.updated_at),
        snippet.id,
      );
    });
  }
  saveView(id: string, savedAt: string, source: StoredDataset, view: Pick<Run, 'result' | 'chart'>) {
    this.db.transaction(() => {
      this.assertDatasetCurrent(source);
      const snippet = this.snippet(id);
      if (!snippet.is_visible || snippet.updated_at !== savedAt)
        conflict('收藏已发生变化，本次刷新结果未写入');
      if (
        !this.db.get(
          'SELECT id FROM conversations WHERE id = ? AND deleted_at IS NULL',
          this.message(id).conversation_id,
        )
      )
        conflict('请先恢复此分析所属的会话');
      this.db.run(
        'UPDATE snippets SET content = ?, updated_at = ? WHERE id = ?',
        JSON.stringify({ result: view.result, chart: view.chart ?? null }),
        timestamp(snippet.updated_at),
        snippet.id,
      );
    });
  }
  publicState(task: Task | null): State {
    const models = this.models();
    const conversations = this.conversations();
    // No large result payload is read for the workspace's successful-analysis list.
    const runs = this.db
      .all<Omit<MessageRow, 'content' | 'status'> & { saved_at: string | null; saved_title: string | null }>(
        `SELECT
      m.id, m.conversation_id, c.dataset_id, m.sequence, m.analysis_options, m.created_at, m.updated_at,
      json_extract(u.content, '$.text') AS question,
      (SELECT updated_at FROM snippets WHERE message_id = m.id AND is_visible = 1 AND deleted_at IS NULL) AS saved_at,
      (SELECT title FROM snippets WHERE message_id = m.id AND is_visible = 1 AND deleted_at IS NULL) AS saved_title
      ${messageFrom} AND m.status = 'done' AND c.deleted_at IS NULL ORDER BY m.created_at DESC, m.sequence DESC`,
      )
      .map((row): RunSummary => {
        const options = parseJSON<MessageOptions>(row.analysis_options);
        return {
          id: row.id,
          conversationId: row.conversation_id,
          datasetId: row.dataset_id,
          sequence: row.sequence,
          question: row.question,
          sourceName: options.source.name,
          strategy: options.analyze.strategy.type,
          analysisOptions: analysisOptions(options),
          createdAt: row.updated_at,
          modelName: `${options.model.provider_name} · ${options.model.model_name}`,
          savedAt: row.saved_at ?? undefined,
          savedTitle: row.saved_title ?? undefined,
          viewUpdatedAt: row.saved_at ?? undefined,
        };
      });
    const tasks = this.db
      .all<MessageRow>(
        `SELECT ${messageColumns} ${messageFrom}
      AND m.status != 'done' AND c.deleted_at IS NULL ORDER BY m.created_at DESC, m.sequence DESC`,
      )
      .map(taskRecord);
    const current =
      task && (runs.some((run) => run.id === task.id) || tasks.some((entry) => entry.id === task.id))
        ? task
        : null;
    if (current && current.status !== 'done') {
      const index = tasks.findIndex((entry) => entry.id === current.id);
      if (index >= 0) tasks[index] = current;
    }
    return {
      conversations: conversations.filter((c) => !c.deletedAt),
      deletedConversations: conversations.filter((c) => c.deletedAt),
      datasets: this.db
        .all<DatasetRow>('SELECT * FROM datasets ORDER BY updated_at DESC, id DESC')
        .map((row) => this.publicDataset(this.datasetRecord(row))),
      runs,
      tasks,
      task: current,
      activeModelId: this.activeModelId,
      theme: this.theme(),
      models: models.map(({ encryptedKey, ...model }) => ({
        ...model,
        hasKey: !!encryptedKey,
      })),
    };
  }
}
