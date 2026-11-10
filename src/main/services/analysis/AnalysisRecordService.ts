import { WorkbenchError } from '@shared/errors';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import type { Repositories } from '../../db';
import type { Conversation, Run, RunSummary, Task } from '@shared/contracts';
import {
  taskRecord,
  sourceSnapshot,
  analysisOptions,
  type StoredDataset,
  type MessageOptions,
  type AssistantMessageContent,
  type AnalysisOutput,
  type SourceSnapshot,
} from '../../db/mappers';
import type { DatasetService } from '../data/DatasetService';
import { timestamp } from '../../utils/time';
import { businessSemantic } from '../../ai/semantics';
import type { AnalysisHistory } from '../../ai/context';

const active = (status: Task['status']) => status === 'running' || status === 'cancelling';

function sourceIdentity(snapshot: SourceSnapshot) {
  return snapshot.format === 'mysql'
    ? {
        format: snapshot.format,
        host: snapshot.config.connection?.host,
        port: snapshot.config.connection?.port,
        database: snapshot.config.connection?.database,
        user: snapshot.config.connection?.user,
      }
    : { format: snapshot.format, path: snapshot.config.path, excelSheets: snapshot.config.excelSheets };
}

export class AnalysisRecordService {
  constructor(
    private data: Repositories,
    private datasets: DatasetService,
  ) {}

  message(id: string) {
    const message = this.data.messages.getAnalysis(id);
    if (!message || !('events' in message.content)) throw new WorkbenchError('CONFLICT', '分析记录不存在');
    return { ...message, content: message.content };
  }

  startTask(task: Task, conversation: Conversation, messageOptions: MessageOptions) {
    return this.data.database.write(() => {
      const currentConversation = this.data.conversations.get(conversation.id);
      if (!currentConversation) throw new WorkbenchError('CONFLICT', '会话不存在');
      if (
        currentConversation.archivedAt ||
        currentConversation.datasetId !== task.datasetId ||
        task.conversationId !== conversation.id
      )
        throw new WorkbenchError('CONFLICT', '会话不存在或不属于当前数据源');
      this.datasets.dataset(task.datasetId);
      if (this.data.messages.hasStatus(conversation.id, ['running', 'cancelling']))
        throw new WorkbenchError('CONFLICT', '此会话已有分析正在进行');
      const userSequence = this.data.messages.nextSequence(conversation.id);
      const startedAt = task.startedAt || timestamp();
      this.data.messages.insert({
        id: randomUUID(),
        conversationId: conversation.id,
        sequence: userSequence,
        role: 'user',
        status: 'done',
        content: { text: task.question },
        createdAt: startedAt,
        updatedAt: startedAt,
      });
      this.data.messages.insert({
        id: task.id,
        conversationId: conversation.id,
        sequence: userSequence + 1,
        role: 'assistant',
        status: 'running',
        content: { events: [] },
        analysisOptions: messageOptions,
        createdAt: startedAt,
        updatedAt: startedAt,
      });
      this.data.conversations.update(conversation.id, {
        title: userSequence === 0 ? task.question.trim().slice(0, 60) : currentConversation.title,
        updatedAt: startedAt,
      });
      return userSequence + 1;
    });
  }

  saveTaskProgress(task: Task) {
    this.data.database.write(() => {
      const row = this.data.messages.get(task.id);
      if (!row || row.role !== 'assistant') throw new WorkbenchError('CONFLICT', '分析记录不存在');
      if (!active(row.status)) return;
      const status = row.status === 'cancelling' ? 'cancelling' : task.status;
      if (!active(status)) throw new WorkbenchError('CONFLICT', '无效的分析进度状态');
      this.data.messages.update(task.id, {
        status,
        updatedAt: timestamp(row.updatedAt),
        content: {
          events: task.events,
          preview: task.preview,
          persistence_error: task.persistenceError,
        },
      });
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
      throw new WorkbenchError('CONFLICT', '分析结束状态与结果不匹配');
    const content: AssistantMessageContent = output
      ? { output, events: task.events }
      : { events: task.events, preview: task.preview, error: task.error };
    const now = timestamp(row.updatedAt);
    this.data.messages.update(task.id, { status: task.status, content, updatedAt: now });
    this.data.conversations.update(row.conversationId, { updatedAt: now });
    this.data.snippets.insert({
      id: randomUUID(),
      messageId: task.id,
      title: row.question,
      content: {
        output,
        error: content.error,
      },
      createdAt: now,
      updatedAt: now,
    });
  }

  finishTask(task: Task, output?: AnalysisOutput) {
    this.data.database.write(() => this.finishMessage(task, output));
  }

  history(conversationId: string, source: StoredDataset): AnalysisHistory {
    const rows = this.data.messages.recentAnalyses(conversationId, 4);
    if (rows.length) this.assertRunSource(rows[rows.length - 1].id, source);
    const older = this.data.messages.recentAnalysisExcerpts(conversationId, 4, 4).map((row) => ({
      question: row.question,
      output: { text: row.text, results: [], charts: [], warning: row.warning || undefined },
      reusable: false,
    }));
    const recent = rows.flatMap((row) => {
      const output = 'output' in row.content ? row.content.output : undefined;
      if (!output) return [];
      const options = row.analysisOptions;
      const reusable =
        isDeepStrictEqual(sourceIdentity(options.source), sourceIdentity(sourceSnapshot(source))) &&
        options.semantic === (businessSemantic(source.semantic, source.metrics).description || '') &&
        isDeepStrictEqual(options.metrics || [], source.metrics || []) &&
        (source.format === 'mysql' ||
          (!!options.dataVersion && options.dataVersion === this.datasets.dataVersion(source)));
      return [{ question: row.question, output, reusable }];
    });
    return [...older, ...recent];
  }

  assertRunSource(id: string, source: StoredDataset) {
    const old = this.message(id).analysisOptions.source;
    if (!isDeepStrictEqual(sourceIdentity(old), sourceIdentity(sourceSnapshot(source))))
      throw new WorkbenchError('CONFLICT', '数据来源或读取配置已变化，请开始新的分析');
  }

  run(id: string): Run {
    const row = this.message(id);
    const content = row.content;
    const output = content.output;
    if (row.status !== 'done' || !output) throw new WorkbenchError('CONFLICT', '分析尚未成功完成');
    const options = row.analysisOptions;
    const snippet = this.data.snippets.getByMessageId(id);
    if (!snippet) throw new WorkbenchError('CONFLICT', '分析片段不存在');
    const view = snippet.content.output;
    return {
      id,
      conversationId: row.conversationId,
      datasetId: row.datasetId,
      sequence: row.sequence,
      question: row.question,
      sourceName: options.source.name,
      excelSheets: options.source.config.excelSheets,
      strategy: options.analyze.strategy.type,
      analysisOptions: analysisOptions(options.analyze.strategy),
      createdAt: row.updatedAt,
      semantic: options.semantic,
      metrics: options.metrics,
      modelName: `${options.model.provider_name} · ${options.model.model_name}`,
      output,
      events: content.events,
      ...(snippet.isVisible
        ? {
            snippet: {
              title: snippet.title,
              updatedAt: snippet.updatedAt,
              ...(view ? { output: view } : {}),
            },
          }
        : {}),
    };
  }

  recoverInterrupted() {
    const interrupted = this.data.messages.listAnalysesByStatus(['running', 'cancelling']);
    if (interrupted.length)
      this.data.database.write(() => {
        for (const row of interrupted)
          this.finishMessage({
            ...taskRecord(row),
            status: 'interrupted',
            error: '应用退出导致任务中断，可重新发起分析。',
          });
      });
  }

  listRuns() {
    return this.data.messages.listRuns().map((row): RunSummary => {
      const options = row.analysisOptions;
      return {
        id: row.id,
        conversationId: row.conversationId,
        datasetId: row.datasetId,
        sequence: row.sequence,
        question: row.question,
        sourceName: options.source.name,
        createdAt: row.updatedAt,
        modelName: `${options.model.provider_name} · ${options.model.model_name}`,
        ...(row.snippetUpdatedAt !== null && row.snippetTitle !== null
          ? { snippet: { title: row.snippetTitle, updatedAt: row.snippetUpdatedAt } }
          : {}),
      };
    });
  }

  listTasks() {
    return this.data.messages.listTasks().map(taskRecord);
  }
}
