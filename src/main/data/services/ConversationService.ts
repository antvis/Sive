import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import {
  and,
  desc,
  eq,
  getTableColumns,
  inArray,
  isNull,
  isNotNull,
  ne,
  notExists,
  sql,
  type SQL,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { conversations, messages, snippets } from '@main/data/db/schema';
import type { Conversation, Run, RunSummary, Task } from '@shared/contracts';
import { WorkbenchError } from '@shared/errors';
import {
  parseJSON,
  conversationRecord,
  taskRecord,
  sourceSnapshot,
  analysisOptions,
  type StoredDataset,
  type MessageOptions,
  type MessageContent,
  type AnalysisOutput,
  type SnippetContent,
} from '@main/data/mappers';
import type { DatasetService } from './DatasetService';
import type { DbService } from '@main/data/db/DbService';
import { conflict, timestamp } from './utils';
const users = alias(messages, 'user_message');
const question = sql<string>`json_extract(${users.content}, '$.text')`;
const precedingUser = and(
  eq(users.conversation_id, messages.conversation_id),
  eq(users.sequence, sql`${messages.sequence} - 1`),
  eq(users.role, 'user'),
);
const assistant = and(eq(messages.role, 'assistant'), isNull(messages.deleted_at));
const running = inArray(messages.status, ['running', 'cancelling']);
const active = (status: Task['status']) => status === 'running' || status === 'cancelling';

export class ConversationService {
  constructor(
    private database: DbService,
    private datasets: DatasetService,
  ) {}
  private get db() {
    return this.database.connection;
  }
  private messageQuery(filter?: SQL) {
    return this.db
      .select({ ...getTableColumns(messages), dataset_id: conversations.dataset_id, question })
      .from(messages)
      .innerJoin(conversations, eq(conversations.id, messages.conversation_id))
      .innerJoin(users, precedingUser)
      .where(and(assistant, filter));
  }
  private message(id: string) {
    return this.messageQuery(eq(messages.id, id)).get() ?? conflict('分析记录不存在');
  }
  conversation(id: string) {
    const row = this.db.select().from(conversations).where(eq(conversations.id, id)).get();
    return row ? conversationRecord(row) : conflict('会话不存在');
  }
  createConversation(datasetId: string) {
    return this.database.write(() => {
      this.datasets.dataset(datasetId);
      const empty = this.db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.dataset_id, datasetId),
            isNull(conversations.deleted_at),
            notExists(
              this.db
                .select({ id: messages.id })
                .from(messages)
                .where(eq(messages.conversation_id, conversations.id)),
            ),
          ),
        )
        .orderBy(desc(conversations.created_at))
        .limit(1)
        .get();
      if (empty) return conversationRecord(empty);
      const now = timestamp();
      return conversationRecord(
        this.db
          .insert(conversations)
          .values({
            id: randomUUID(),
            dataset_id: datasetId,
            title: '新会话',
            created_at: now,
            updated_at: now,
          })
          .returning()
          .get(),
      );
    });
  }
  deleteConversation(id: string) {
    this.database.write(() => {
      this.conversation(id);
      if (
        this.db
          .select({ id: messages.id })
          .from(messages)
          .where(and(eq(messages.conversation_id, id), running))
          .get()
      )
        conflict('请先停止此会话的分析');
      const now = timestamp();
      this.db
        .update(conversations)
        .set({ deleted_at: now, updated_at: now })
        .where(eq(conversations.id, id))
        .run();
    });
  }
  restoreConversation(id: string) {
    this.database.write(() => {
      if (
        !this.db
          .update(conversations)
          .set({ deleted_at: null, updated_at: timestamp() })
          .where(and(eq(conversations.id, id), isNotNull(conversations.deleted_at)))
          .run().changes
      )
        conflict('已归档会话不存在');
    });
  }
  purgeConversations(ids: string[]) {
    this.database.write(() => {
      for (const id of ids) if (!this.conversation(id).deletedAt) conflict('只能永久删除已归档的会话');
      this.db.delete(conversations).where(inArray(conversations.id, ids)).run();
    });
  }
  startTask(task: Task, conversation: Conversation, options: MessageOptions) {
    return this.database.write(() => {
      const current = this.conversation(conversation.id);
      if (
        current.deletedAt ||
        current.datasetId !== task.datasetId ||
        task.conversationId !== conversation.id
      )
        return conflict('会话不存在或不属于当前数据源');
      this.datasets.dataset(task.datasetId);
      if (
        this.db
          .select({ id: messages.id })
          .from(messages)
          .where(and(running, isNull(messages.deleted_at)))
          .get()
      )
        conflict('已有分析正在进行');
      const sequence = this.db
        .select({ next: sql<number>`coalesce(max(${messages.sequence}) + 1, 0)` })
        .from(messages)
        .where(eq(messages.conversation_id, conversation.id))
        .get()!.next;
      const now = task.startedAt || timestamp();
      this.db
        .insert(messages)
        .values([
          {
            id: randomUUID(),
            conversation_id: conversation.id,
            sequence,
            role: 'user',
            status: 'done',
            content: JSON.stringify({ text: task.question }),
            created_at: now,
            updated_at: now,
          },
          {
            id: task.id,
            conversation_id: conversation.id,
            sequence: sequence + 1,
            role: 'assistant',
            status: 'running',
            content: JSON.stringify({ events: [] }),
            analysis_options: JSON.stringify(options),
            created_at: now,
            updated_at: now,
          },
        ])
        .run();
      this.db
        .update(conversations)
        .set({ title: sequence === 0 ? task.question.trim().slice(0, 60) : current.title, updated_at: now })
        .where(eq(conversations.id, conversation.id))
        .run();
      return sequence + 1;
    });
  }
  saveTaskProgress(task: Task) {
    this.database.write(() => {
      const row = this.message(task.id);
      if (!active(row.status)) return;
      const status = row.status === 'cancelling' ? 'cancelling' : task.status;
      if (!active(status)) conflict('无效的分析进度状态');
      this.db
        .update(messages)
        .set({
          status,
          updated_at: timestamp(row.updated_at),
          content: JSON.stringify({
            events: task.events,
            preview: task.preview,
            persistence_error: task.persistenceError,
          }),
        })
        .where(eq(messages.id, task.id))
        .run();
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
    this.db
      .update(messages)
      .set({ status: task.status, content: JSON.stringify(content), updated_at: now })
      .where(eq(messages.id, task.id))
      .run();
    this.db
      .update(conversations)
      .set({ updated_at: now })
      .where(eq(conversations.id, row.conversation_id))
      .run();
    this.db
      .insert(snippets)
      .values({
        id: randomUUID(),
        message_id: task.id,
        title: row.question,
        content: JSON.stringify({
          result: content.result ?? content.preview,
          chart: content.chart,
          chart_error: content.chart_error,
          error: content.error,
        }),
        created_at: now,
        updated_at: now,
      })
      .run();
  }
  finishTask(task: Task, output?: AnalysisOutput) {
    this.database.write(() => this.finishMessage(task, output));
  }
  private snippet(id: string) {
    return (
      this.db
        .select()
        .from(snippets)
        .where(and(eq(snippets.message_id, id), isNull(snippets.deleted_at)))
        .get() ?? conflict('分析片段不存在')
    );
  }
  latestRun(conversationId: string) {
    const row = this.db
      .select({ id: messages.id })
      .from(messages)
      .where(and(assistant, eq(messages.conversation_id, conversationId), eq(messages.status, 'done')))
      .orderBy(desc(messages.sequence))
      .limit(1)
      .get();
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
    this.database.write(() => {
      if (this.message(id).status !== 'done') conflict('只能保存已完成的分析');
      const snippet = this.snippet(id);
      if (!snippet.is_visible)
        this.db
          .update(snippets)
          .set({ is_visible: 1, updated_at: timestamp(snippet.updated_at) })
          .where(eq(snippets.id, snippet.id))
          .run();
    });
  }
  removeSavedAnalysis(id: string) {
    this.database.write(() => {
      const snippet = this.snippet(id);
      this.db
        .update(snippets)
        .set({ is_visible: 0, updated_at: timestamp(snippet.updated_at) })
        .where(eq(snippets.id, snippet.id))
        .run();
    });
  }
  renameSavedAnalysis(id: string, title: string) {
    this.database.write(() => {
      const snippet = this.snippet(id);
      if (!snippet.is_visible) conflict('此分析已从收藏移除');
      if (!title.trim()) throw new WorkbenchError('INVALID_INPUT', '请输入收藏标题');
      this.db
        .update(snippets)
        .set({ title: title.trim(), updated_at: timestamp(snippet.updated_at) })
        .where(eq(snippets.id, snippet.id))
        .run();
    });
  }
  saveView(id: string, savedAt: string, source: StoredDataset, view: Pick<Run, 'result' | 'chart'>) {
    this.database.write(() => {
      this.datasets.assertDatasetCurrent(source);
      const snippet = this.snippet(id);
      if (!snippet.is_visible || snippet.updated_at !== savedAt)
        conflict('收藏已发生变化，本次刷新结果未写入');
      if (this.conversation(this.message(id).conversation_id).deletedAt) conflict('请先恢复此分析所属的会话');
      this.db
        .update(snippets)
        .set({
          content: JSON.stringify({ result: view.result, chart: view.chart ?? null }),
          updated_at: timestamp(snippet.updated_at),
        })
        .where(eq(snippets.id, snippet.id))
        .run();
    });
  }
  recoverInterrupted() {
    const interrupted = this.messageQuery(running).all();
    if (interrupted.length)
      this.database.write(() => {
        for (const row of interrupted)
          this.finishMessage({
            ...taskRecord(row),
            status: 'interrupted',
            error: '应用退出导致任务中断，可重新发起分析。',
          });
      });
  }
  listConversations() {
    return this.db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.created_at), desc(conversations.id))
      .all()
      .map(conversationRecord);
  }
  listRuns() {
    return this.db
      .select({
        id: messages.id,
        conversation_id: messages.conversation_id,
        dataset_id: conversations.dataset_id,
        sequence: messages.sequence,
        analysis_options: messages.analysis_options,
        updated_at: messages.updated_at,
        question,
        saved_at: snippets.updated_at,
        saved_title: snippets.title,
      })
      .from(messages)
      .innerJoin(conversations, eq(conversations.id, messages.conversation_id))
      .innerJoin(users, precedingUser)
      .leftJoin(
        snippets,
        and(eq(snippets.message_id, messages.id), eq(snippets.is_visible, 1), isNull(snippets.deleted_at)),
      )
      .where(and(assistant, eq(messages.status, 'done'), isNull(conversations.deleted_at)))
      .orderBy(desc(messages.created_at), desc(messages.sequence))
      .all()
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
  }
  listTasks() {
    return this.messageQuery(and(ne(messages.status, 'done'), isNull(conversations.deleted_at)))
      .orderBy(desc(messages.created_at), desc(messages.sequence))
      .all()
      .map(taskRecord);
  }
}
