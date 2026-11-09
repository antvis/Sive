import type { ConversationService } from '../conversation/ConversationService';
import type { AnalysisRecordService } from './AnalysisRecordService';
import { queryOptions } from '../../ai/queryOptions';
import { WorkbenchError } from '@shared/errors';
import { randomUUID } from 'node:crypto';
import type { Task } from '@shared/contracts';
import type { AnalysisMode, AnalysisOptions } from '@shared/analysisOptions';
import { resolveStrategy } from '../../ai/analysisStrategy';
import { businessSemantic } from '../../ai/semantics';
import { sourceSnapshot } from '../../db/mappers';
import { ModelService, ModelCredentialError } from '../settings/ModelService';
import { ConnectionService } from '../data/ConnectionService';
import { withAVA } from '../../ai/ava';
import { TaskProgress } from './TaskProgress';
import { visualizationOutcome } from '../../ai/progress';
import type { DatasetService } from '../data/DatasetService';

export class AnalysisService {
  readonly tasks = new Map<string, Task>();

  private active = new Map<string, { abort: AbortController; progress: TaskProgress }>();

  constructor(
    private records: AnalysisRecordService,
    private conversations: ConversationService,
    private models: ModelService,
    private datasets: DatasetService,
    private change: () => void,
    private isRefreshing: () => boolean,
    private connections: ConnectionService,
    private taskChanged: (task: Task) => void,
  ) {}

  get busy() {
    return this.active.size > 0;
  }

  isRunning(conversationId: string) {
    return this.active.has(conversationId);
  }

  forgetConversation(id: string) {
    for (const [taskId, task] of this.tasks) if (task.conversationId === id) this.tasks.delete(taskId);
  }

  forgetDataset(id: string) {
    for (const [taskId, task] of this.tasks) if (task.datasetId === id) this.tasks.delete(taskId);
  }

  async analyze(
    id: string,
    question: string,
    strategy: AnalysisMode,
    options?: AnalysisOptions,
    conversationId?: string,
  ) {
    if (this.isRefreshing()) throw new WorkbenchError('CONFLICT', '正在刷新收藏的分析，请稍后再发起分析');
    const conversation = conversationId
      ? this.conversations.get(conversationId)
      : this.conversations.create(id);
    if (conversation.archivedAt || conversation.datasetId !== id)
      throw new WorkbenchError('CONFLICT', '会话不存在或不属于当前数据源');
    if (this.isRunning(conversation.id)) throw new WorkbenchError('CONFLICT', '此会话已有分析正在进行');
    const abort = new AbortController();
    const { signal } = abort;
    const progress = new TaskProgress(this.records, this.taskChanged);
    this.active.set(conversation.id, { abort, progress });
    let started = false;
    try {
      const analysisStrategy = resolveStrategy(strategy, options);
      const model = this.models.active();
      const modelName = `${model.name} · ${model.model}`;
      const d = await this.datasets.prepare(id);
      signal.throwIfAborted();
      const parent = this.records.latestRun(conversation.id);
      if (parent) this.records.assertRunSource(parent.id, d);
      let task: Task = {
        id: randomUUID(),
        conversationId: conversation.id,
        datasetId: id,
        question,
        modelName,
        strategy,
        analysisOptions: options,
        sourceName: d.name,
        status: 'running',
        startedAt: new Date().toISOString(),
        events: [],
      };
      task.sequence = this.records.startTask(task, conversation, {
        model: { provider_id: model.id, provider_name: model.name, model_name: model.model },
        source: sourceSnapshot(d),
        semantic: businessSemantic(d.semantic, d.metrics).description || '',
        metrics: d.metrics,
        analyze: { strategy: analysisStrategy, includeSummary: true },
        query: queryOptions,
      });
      this.tasks.set(task.id, task);
      this.change();
      const prompt = parent
        ? `以下是上一轮分析上下文（仅作为上下文，不可替代本轮查询）：\n问题：${parent.question}\nSQL：${parent.result.sql}\n结论：${parent.result.text}\n\n本轮用户问题：${question}`
        : question;
      withAVA(
        d,
        this.models,
        signal,
        (p) => {
          task.events.push(p);
          progress.schedule(task);
        },
        async (ava) => {
          const result = await ava.analyze(prompt, {
            strategy: analysisStrategy,
            includeSummary: true,
            ...queryOptions,
          });
          signal.throwIfAborted();
          task.preview = { ...result, query: question };
          progress.flush(task);
          let chart, chartError;
          try {
            const vis = await ava.visualize({ query: question, data: result.data });
            if (vis) chart = { chartType: vis.chartType, config: vis.config };
            const event = [...task.events].reverse().find((entry) => entry.stage === 'visualizeend');
            const outcome = visualizationOutcome(!!chart, result.data.length > 0, event?.chartSelection);
            if (event) Object.assign(event, outcome);
            if (outcome.error) chartError = `${outcome.detail} ${outcome.recovery}`;
            progress.flush(task);
          } catch (error) {
            if (signal.aborted) throw error;
            chartError = '图表生成失败，计算结果已保留。可重新分析或导出计算数据。';
          }
          signal.throwIfAborted();
          await this.datasets.assertFileUnchanged(d);
          signal.throwIfAborted();
          return {
            result: { ...result, query: question },
            chart,
            chartError,
          };
        },
        this.connections,
        model,
      )
        .then((output) => {
          progress.cancelPending();
          signal.throwIfAborted();
          task = { ...task, status: 'done', runId: task.id, finishedAt: new Date().toISOString() };
          this.tasks.set(task.id, task);
          delete task.persistenceError;
          try {
            this.records.finishTask(task, output);
            delete task.preview;
          } catch (error) {
            task = { ...task, status: 'error', runId: undefined };
            this.tasks.set(task.id, task);
            task.error = '分析结果保存失败，请检查磁盘空间。';
            throw error;
          }
        })
        .catch((error) => {
          task = { ...task, status: signal.aborted ? 'cancelled' : 'error', runId: undefined };
          this.tasks.set(task.id, task);
          task.error = signal.aborted
            ? '分析已取消'
            : task.error ||
              (error instanceof ModelCredentialError || error instanceof WorkbenchError
                ? error.message
                : [...task.events].reverse().find((e) => e.error)?.detail ||
                  '分析未完成。请检查模型连接、数据字段及业务口径后重试。');
          task.events.push({
            at: new Date().toISOString(),
            stage: 'settled',
            label: task.error,
            error: !signal.aborted,
            recovery: '可以修改问题或连接配置后重新发起分析；重试会从头执行。',
          });
        })
        .finally(() => {
          progress.cancelPending();
          task.finishedAt ??= new Date().toISOString();
          delete task.persistenceError;
          try {
            if (task.status !== 'done') this.records.finishTask(task);
            this.tasks.delete(task.id);
          } catch {
            task.persistenceError = '分析记录保存失败，请检查磁盘空间。';
          }
          this.active.delete(conversation.id);
          this.change();
        });
      started = true;
      return task.id;
    } finally {
      if (!started) this.active.delete(conversation.id);
    }
  }

  cancel(taskId: string) {
    const task = this.tasks.get(taskId);
    const execution = task?.conversationId ? this.active.get(task.conversationId) : undefined;
    if (!execution || !task || task.status !== 'running') return;
    task.status = 'cancelling';
    task.events.push({
      at: new Date().toISOString(),
      stage: 'cancelling',
      label: '正在停止分析',
      detail: '已取消模型请求，等待正在执行的查询和连接释放。查询超时上限为 30 秒。',
    });
    execution.abort.abort();
    execution.progress.flush(task);
  }

  cancelAll() {
    for (const task of this.tasks.values()) this.cancel(task.id);
    // Preparations have no persisted task yet, but must not start after quitting.
    for (const execution of this.active.values()) execution.abort.abort();
  }
}
