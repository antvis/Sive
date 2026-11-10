import type { ConversationService } from '../conversation/ConversationService';
import type { AnalysisRecordService } from './AnalysisRecordService';
import { LOOP_QUERY_OPTIONS, QUERY_OPTIONS } from '../../ai/queryOptions';
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
import { runAgent } from '../../ai/agent';
import type { DatasetService } from '../data/DatasetService';
import type { AnalysisHistory } from '../../ai/context';
import type { AnalysisOutput, StoredDataset, StoredModel } from '../../db/mappers';

type TaskExecutionContext = {
  task: Task;
  dataset: StoredDataset;
  modelProfile: StoredModel;
  resolvedStrategy: ReturnType<typeof resolveStrategy>;
  conversationHistory: AnalysisHistory;
  abortController: AbortController;
  analysisSignal: AbortSignal;
  taskProgress: TaskProgress;
};

export class AnalysisService {
  readonly tasks = new Map<string, Task>();

  private activeExecutions = new Map<
    string,
    { abortController: AbortController; taskProgress: TaskProgress }
  >();

  constructor(
    private records: AnalysisRecordService,
    private conversations: ConversationService,
    private models: ModelService,
    private datasets: DatasetService,
    private workspaceChanged: () => void,
    private isSavedAnalysisRefreshing: () => boolean,
    private connections: ConnectionService,
    private taskChanged: (task: Task) => void,
  ) {}

  get busy() {
    return this.activeExecutions.size > 0;
  }

  isRunning(conversationId: string) {
    return this.activeExecutions.has(conversationId);
  }

  forgetConversation(conversationId: string) {
    for (const [taskId, task] of this.tasks)
      if (task.conversationId === conversationId) this.tasks.delete(taskId);
  }

  forgetDataset(datasetId: string) {
    for (const [taskId, task] of this.tasks) if (task.datasetId === datasetId) this.tasks.delete(taskId);
  }

  async analyze(
    datasetId: string,
    question: string,
    mode: AnalysisMode,
    analysisOptions?: AnalysisOptions,
    conversationId?: string,
  ) {
    if (this.isSavedAnalysisRefreshing())
      throw new WorkbenchError('CONFLICT', '正在刷新收藏的分析，请稍后再发起分析');
    const conversation = conversationId
      ? this.conversations.get(conversationId)
      : this.conversations.create(datasetId);
    if (conversation.archivedAt || conversation.datasetId !== datasetId)
      throw new WorkbenchError('CONFLICT', '会话不存在或不属于当前数据源');
    if (this.isRunning(conversation.id)) throw new WorkbenchError('CONFLICT', '此会话已有分析正在进行');
    const abortController = new AbortController();
    const analysisSignal = AbortSignal.any([abortController.signal, AbortSignal.timeout(300000)]);
    const taskProgress = new TaskProgress(this.records, this.taskChanged);
    this.activeExecutions.set(conversation.id, { abortController, taskProgress });
    let executionStarted = false;
    try {
      const resolvedStrategy = resolveStrategy(mode, analysisOptions);
      const modelProfile = this.models.active();
      const modelName = `${modelProfile.name} · ${modelProfile.model}`;
      const dataset = await this.datasets.prepare(datasetId);
      analysisSignal.throwIfAborted();
      this.retryPendingPersistence(conversation.id);
      const conversationHistory = this.records.history(conversation.id, dataset);
      const task: Task = {
        id: randomUUID(),
        conversationId: conversation.id,
        datasetId,
        question,
        modelName,
        strategy: mode,
        analysisOptions,
        sourceName: dataset.name,
        status: 'running',
        startedAt: new Date().toISOString(),
        events: [],
      };
      task.sequence = this.records.startTask(task, conversation, {
        model: {
          provider_id: modelProfile.id,
          provider_name: modelProfile.name,
          model_name: modelProfile.model,
        },
        source: sourceSnapshot(dataset),
        semantic: businessSemantic(dataset.semantic, dataset.metrics).description || '',
        metrics: dataset.metrics,
        dataVersion: this.datasets.dataVersion(dataset),
        analyze: { strategy: resolvedStrategy, includeSummary: false },
        query: mode === 'loop' ? LOOP_QUERY_OPTIONS : QUERY_OPTIONS,
      });
      this.tasks.set(task.id, task);
      void this.executeTask({
        task,
        dataset,
        modelProfile,
        resolvedStrategy,
        conversationHistory,
        abortController,
        analysisSignal,
        taskProgress,
      }).catch((error) =>
        console.error('分析任务收尾失败', error instanceof Error ? error.name : 'UnknownError'),
      );
      executionStarted = true;
      this.notifyWorkspaceChanged();
      return task.id;
    } finally {
      if (!executionStarted) this.activeExecutions.delete(conversation.id);
    }
  }

  private notifyWorkspaceChanged() {
    try {
      this.workspaceChanged();
    } catch {
      // The renderer may have closed; the persisted task remains available after reload.
    }
  }

  private retryPendingPersistence(conversationId: string) {
    let recoveredTask = false;
    for (const [taskId, task] of this.tasks) {
      if (task.conversationId !== conversationId || !task.persistenceError) continue;
      this.records.finishTask(task);
      this.tasks.delete(taskId);
      recoveredTask = true;
    }
    if (recoveredTask) this.notifyWorkspaceChanged();
  }

  private async executeTask(context: TaskExecutionContext) {
    const {
      dataset,
      modelProfile,
      resolvedStrategy,
      conversationHistory,
      abortController,
      analysisSignal,
      taskProgress,
    } = context;
    let { task } = context;
    let analysisOutput: AnalysisOutput | undefined;
    let terminalSaved = false;
    const reportProgress = (event: Task['events'][number]) => {
      if (task.strategy === 'direct' && ['stepstart', 'stepend'].includes(event.stage))
        event = {
          ...event,
          label: event.error
            ? '分析查询未完成'
            : event.stage === 'stepstart'
              ? '分析问题并计算结果'
              : '分析查询已结束',
          detail: event.error ? event.detail : task.question,
        };
      task.events.push(event);
      taskProgress.schedule(task);
    };
    try {
      analysisOutput = await withAVA(
        dataset,
        this.models,
        analysisSignal,
        reportProgress,
        async (ava, languageModel) => {
          if (!languageModel) throw new WorkbenchError('MODEL', '请先配置模型');
          const result = await runAgent(
            ava,
            languageModel,
            task.question,
            resolvedStrategy,
            conversationHistory,
            analysisSignal,
            reportProgress,
            (preview) => {
              task.preview = preview;
              taskProgress.flush(task);
            },
          );
          analysisSignal.throwIfAborted();
          await this.datasets.assertFileUnchanged(dataset);
          analysisSignal.throwIfAborted();
          return result;
        },
        this.connections,
        modelProfile,
      );
      taskProgress.cancelPending();
      analysisSignal.throwIfAborted();
      task = { ...task, status: 'done', runId: task.id, finishedAt: new Date().toISOString() };
      this.records.finishTask(task, analysisOutput);
      delete task.preview;
      terminalSaved = true;
    } catch (error) {
      task = {
        ...task,
        status: abortController.signal.aborted ? 'cancelled' : 'error',
        runId: undefined,
        finishedAt: new Date().toISOString(),
      };
      task.error = abortController.signal.aborted
        ? '分析已取消'
        : analysisSignal.aborted
          ? '分析超过 5 分钟，已停止模型请求。请缩小范围后重试。'
          : analysisOutput
            ? '分析结果保存失败，请检查磁盘空间。'
            : error instanceof ModelCredentialError || error instanceof WorkbenchError
              ? error.message
              : [...task.events].reverse().find((event) => event.error)?.detail ||
                '分析未完成。请检查模型连接、数据字段及业务口径后重试。';
      task.events.push({
        at: new Date().toISOString(),
        stage: 'settled',
        label: task.error,
        error: !abortController.signal.aborted,
        recovery: '可以修改问题或连接配置后重新发起分析；重试会从头执行。',
      });
      try {
        this.records.finishTask(task);
        terminalSaved = true;
      } catch {
        task.persistenceError = '分析记录保存失败，请检查磁盘空间。';
      }
    } finally {
      taskProgress.cancelPending();
      if (terminalSaved) this.tasks.delete(task.id);
      else this.tasks.set(task.id, task);
      if (task.conversationId) this.activeExecutions.delete(task.conversationId);
      this.notifyWorkspaceChanged();
    }
  }

  cancel(taskId: string) {
    const task = this.tasks.get(taskId);
    const execution = task?.conversationId ? this.activeExecutions.get(task.conversationId) : undefined;
    if (!execution || !task || task.status !== 'running') return;
    task.status = 'cancelling';
    task.events.push({
      at: new Date().toISOString(),
      stage: 'cancelling',
      label: '正在停止分析',
      detail: '已取消模型请求，等待正在执行的查询和连接释放。查询超时上限为 30 秒。',
    });
    execution.abortController.abort();
    execution.taskProgress.flush(task);
  }

  cancelAll() {
    for (const task of this.tasks.values()) this.cancel(task.id);
    // Preparations have no persisted task yet, but must not start after quitting.
    for (const execution of this.activeExecutions.values()) execution.abortController.abort();
  }
}
