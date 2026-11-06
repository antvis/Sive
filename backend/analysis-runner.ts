import { queryOptions } from './query-options';
import { WorkbenchError } from '../shared/errors';
import { randomUUID } from 'node:crypto';
import type { Task, Run } from '../shared/contracts';
import type { AnalysisMode, AnalysisOptions } from '../shared/analysis-options';
import { resolveStrategy } from './analysis-strategy';
import { businessSemantic } from './semantics';
import { Store } from './store';
import { Models, ModelCredentialError } from './models';
import { Connections } from './connections';
import { withAVA } from './ava-service';
import { TaskProgress } from './task-progress';
import { visualizationOutcome } from './progress';
import type { DatasetService } from './datasets';
export class AnalysisRunner {
  task: Task | null = null;
  private abort?: AbortController;
  private progress: TaskProgress;
  private preparing = false;
  constructor(
    private store: Store,
    private models: Models,
    private datasets: DatasetService,
    private change: () => void,
    private isRefreshing: () => boolean,
    private connections?: Connections,
    taskChanged: (task: Task) => void = () => {},
  ) {
    this.progress = new TaskProgress(store, taskChanged);
  }
  get busy() {
    return this.preparing || this.task?.status === 'running' || this.task?.status === 'cancelling';
  }
  async analyze(
    id: string,
    question: string,
    strategy: AnalysisMode,
    parentId?: string,
    options?: AnalysisOptions,
    conversationId?: string,
  ) {
    if (this.isRefreshing()) throw new WorkbenchError('CONFLICT', '正在刷新收藏的分析，请稍后再发起分析');
    if (this.busy) throw new WorkbenchError('CONFLICT', '已有分析正在进行');
    this.preparing = true;
    try {
      const analysisStrategy = resolveStrategy(strategy, options);
      const d = await this.datasets.prepare(id),
        model = this.models.active(),
        modelName = `${model.name} · ${model.model}`,
        parent = parentId ? this.store.run(parentId) : undefined;
      if (parent && parent.datasetId !== id) throw new WorkbenchError('CONFLICT', '追问必须使用同一数据源');
      if (parent && parent.fingerprint !== d.fingerprint)
        throw new WorkbenchError('CONFLICT', '数据或连接已更新，请开始新的分析');
      if (parent && JSON.stringify(parent.excelSheets) !== JSON.stringify(d.excelSheets))
        throw new WorkbenchError('CONFLICT', 'Excel 读取区域已调整，请开始新的分析，不要沿用旧结果追问');
      const chatId = conversationId || parent?.conversationId;
      const conversation = chatId
        ? this.store.view.conversations.find((item) => item.id === chatId)
        : this.store.createConversation(id);
      if (!conversation || conversation.deletedAt || conversation.datasetId !== id)
        throw new WorkbenchError('CONFLICT', '会话不存在或不属于当前数据源');
      if (parent?.conversationId && parent.conversationId !== conversation.id)
        throw new WorkbenchError('CONFLICT', '不能跨会话关联分析上下文');
      let task: Task = {
        id: randomUUID(),
        conversationId: conversation.id,
        datasetId: id,
        question,
        modelName,
        parentId,
        strategy,
        analysisOptions: options,
        sourceName: d.name,
        status: 'running',
        startedAt: new Date().toISOString(),
        events: [],
      };
      this.store.startTask(task, conversation);
      this.task = task;
      this.change();
      this.abort = new AbortController();
      const signal = this.abort.signal;
      const prompt = parent
        ? `以下是上一轮分析上下文（仅作为上下文，不可替代本轮查询）：\n问题：${parent.question}\nSQL：${parent.result.sql}\n结论：${parent.result.text}\n\n本轮用户问题：${question}`
        : question;
      withAVA(
        d,
        this.models,
        signal,
        (p) => {
          task.events.push(p);
          this.progress.schedule(task);
        },
        async (ava) => {
          const result = await ava.analyze(prompt, {
            strategy: analysisStrategy,
            includeSummary: true,
            ...queryOptions,
          });
          signal.throwIfAborted();
          task.preview = { ...result, query: question };
          this.progress.flush(task);
          let chart, chartError;
          try {
            const vis = await ava.visualize({ query: question, data: result.data });
            if (vis) chart = { chartType: vis.chartType, config: vis.config };
            const event = [...task.events].reverse().find((entry) => entry.stage === 'visualizeend');
            const outcome = visualizationOutcome(!!chart, result.data.length > 0, event?.chartSelection);
            if (event) Object.assign(event, outcome);
            if (outcome.error) chartError = `${outcome.detail} ${outcome.recovery}`;
            this.progress.flush(task);
          } catch (error) {
            if (signal.aborted) throw error;
            chartError = '图表生成失败，计算结果已保留。可重新分析或导出计算数据。';
          }
          signal.throwIfAborted();
          await this.datasets.assertFileUnchanged(d);
          signal.throwIfAborted();
          const run: Run = {
            id: randomUUID(),
            conversationId: conversation.id,
            datasetId: id,
            sourceName: d.name,
            fingerprint: d.fingerprint,
            excelSheets: d.excelSheets,
            question,
            strategy,
            analysisOptions:
              analysisStrategy.type === 'direct'
                ? { maxRetries: analysisStrategy.maxRetries }
                : { maxSteps: analysisStrategy.maxSteps },
            parentId,
            createdAt: new Date().toISOString(),
            semantic: businessSemantic(d.semantic, d.metrics).description || '',
            metrics: d.metrics,
            modelName,
            result: { ...result, query: question },
            chart,
            chartError,
            events: [...task.events],
          };
          return run;
        },
        this.connections,
        model,
      )
        .then((run) => {
          this.progress.cancelPending();
          signal.throwIfAborted();
          task = { ...task, status: 'done', runId: run.id, finishedAt: new Date().toISOString() };
          this.task = task;
          delete task.preview;
          delete task.persistenceError;
          try {
            this.store.finishTask(task, run);
          } catch (error) {
            task = { ...task, status: 'error', runId: undefined };
            this.task = task;
            task.error = '分析结果保存失败，请检查磁盘空间。';
            throw error;
          }
        })
        .catch((error) => {
          task = { ...task, status: signal.aborted ? 'cancelled' : 'error', runId: undefined };
          this.task = task;
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
          this.progress.cancelPending();
          task.finishedAt ??= new Date().toISOString();
          delete task.persistenceError;
          try {
            if (task.status !== 'done') this.store.finishTask(task);
            this.store.clearTaskProgress();
          } catch {
            task.persistenceError = '分析记录保存失败，请检查磁盘空间。';
          }
          this.change();
        });
      return task.id;
    } finally {
      this.preparing = false;
    }
  }
  cancel() {
    if (!this.busy || !this.task) return;
    this.task.status = 'cancelling';
    this.task.events.push({
      at: new Date().toISOString(),
      stage: 'cancelling',
      label: '正在停止分析',
      detail: '已取消模型请求，等待正在执行的查询和连接释放。查询超时上限为 30 秒。',
    });
    this.abort?.abort();
    this.progress.flush(this.task);
  }
}
