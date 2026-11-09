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
} from '../../db/mappers';
import type { DatasetService } from '../data/DatasetService';
import { timestamp } from '../../utils/time';

const active = (status: Task['status']) => status === 'running' || status === 'cancelling';

export class AnalysisRecordService {
  constructor(
    private data: Repositories,
    private datasets: DatasetService,
  ) {}

  message(id: string) {
    const message = this.data.messages.getAnalysis(id);
    if (!message) throw new WorkbenchError('CONFLICT', '分析记录不存在');
    return message;
  }

  startTask(task: Task, conversation: Conversation, options: MessageOptions) {
    return this.data.database.write(() => {
      const current = this.data.conversations.get(conversation.id);
      if (!current) throw new WorkbenchError('CONFLICT', '会话不存在');
      if (
        current.archivedAt ||
        current.datasetId !== task.datasetId ||
        task.conversationId !== conversation.id
      )
        throw new WorkbenchError('CONFLICT', '会话不存在或不属于当前数据源');
      this.datasets.dataset(task.datasetId);
      if (this.data.messages.hasStatus(conversation.id, ['running', 'cancelling']))
        throw new WorkbenchError('CONFLICT', '此会话已有分析正在进行');
      const sequence = this.data.messages.nextSequence(conversation.id);
      const now = task.startedAt || timestamp();
      this.data.messages.insertMany([
        {
          id: randomUUID(),
          conversationId: conversation.id,
          sequence,
          role: 'user',
          status: 'done',
          content: { text: task.question },
          createdAt: now,
          updatedAt: now,
        },
        {
          id: task.id,
          conversationId: conversation.id,
          sequence: sequence + 1,
          role: 'assistant',
          status: 'running',
          content: { events: [] },
          analysisOptions: options,
          createdAt: now,
          updatedAt: now,
        },
      ]);
      this.data.conversations.update(conversation.id, {
        title: sequence === 0 ? task.question.trim().slice(0, 60) : current.title,
        updatedAt: now,
      });
      return sequence + 1;
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
      ? { result: output.result, chart: output.chart, chart_error: output.chartError, events: task.events }
      : { events: task.events, preview: task.preview, error: task.error };
    const now = timestamp(row.updatedAt);
    this.data.messages.update(task.id, { status: task.status, content, updatedAt: now });
    this.data.conversations.update(row.conversationId, { updatedAt: now });
    this.data.snippets.insert({
      id: randomUUID(),
      messageId: task.id,
      title: row.question,
      content: {
        result: content.result ?? content.preview,
        chart: content.chart,
        chart_error: content.chart_error,
        error: content.error,
      },
      createdAt: now,
      updatedAt: now,
    });
  }

  finishTask(task: Task, output?: AnalysisOutput) {
    this.data.database.write(() => this.finishMessage(task, output));
  }

  latestRun(conversationId: string) {
    const id = this.data.messages.latestAnalysisId(conversationId, 'done');
    return id ? this.run(id) : undefined;
  }

  assertRunSource(id: string, source: StoredDataset) {
    const old = (this.message(id).analysisOptions as MessageOptions).source;
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
      throw new WorkbenchError('CONFLICT', '数据来源或读取配置已变化，请开始新的分析');
  }

  run(id: string): Run {
    const row = this.message(id);
    const content = row.content as AssistantMessageContent;
    if (row.status !== 'done' || !content.result) throw new WorkbenchError('CONFLICT', '分析尚未成功完成');
    const options = row.analysisOptions as MessageOptions;
    const snippet = this.data.snippets.getByMessageId(id);
    if (!snippet) throw new WorkbenchError('CONFLICT', '分析片段不存在');
    const view = snippet.content;
    return {
      id,
      conversationId: row.conversationId,
      datasetId: row.datasetId,
      sequence: row.sequence,
      question: row.question,
      sourceName: options.source.name,
      excelSheets: options.source.config.excelSheets,
      strategy: options.analyze.strategy.type,
      analysisOptions: analysisOptions(options),
      createdAt: row.updatedAt,
      semantic: options.semantic,
      metrics: options.metrics,
      modelName: `${options.model.provider_name} · ${options.model.model_name}`,
      result: content.result,
      chart: content.chart,
      chartError: content.chart_error,
      events: content.events,
      ...(snippet.isVisible
        ? {
            savedAt: snippet.updatedAt,
            savedTitle: snippet.title,
            savedView: view.result
              ? { result: view.result, chart: view.chart ?? undefined, updatedAt: snippet.updatedAt }
              : undefined,
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
      const options = row.analysisOptions as MessageOptions;
      return {
        id: row.id,
        conversationId: row.conversationId,
        datasetId: row.datasetId,
        sequence: row.sequence,
        question: row.question,
        sourceName: options.source.name,
        strategy: options.analyze.strategy.type,
        analysisOptions: analysisOptions(options),
        createdAt: row.updatedAt,
        modelName: `${options.model.provider_name} · ${options.model.model_name}`,
        savedAt: row.savedAt ?? undefined,
        savedTitle: row.savedTitle ?? undefined,
        viewUpdatedAt: row.savedAt ?? undefined,
      };
    });
  }

  listTasks() {
    return this.data.messages.listTasks().map(taskRecord);
  }
}
