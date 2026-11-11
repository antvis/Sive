import type { ConversationService } from '../conversation/ConversationService';
import type { AnalysisRecordService } from './AnalysisRecordService';
import { WorkbenchError } from '@shared/errors';
import { randomUUID } from 'node:crypto';
import type { Task, AnalysisMode, AnalysisOptions } from '@shared/contracts';
import { businessSemantic } from '../../ai/semantics';
import { sourceSnapshot } from '../../db/mappers';
import { ModelService } from '../settings/ModelService';
import { ConnectionService } from '../data/ConnectionService';
import { withAVA } from '../../ava';
import { TaskProgress } from './TaskProgress';
import { runAgent, resolveStrategy } from '../../ai/agent';
import type { DatasetService } from '../data/DatasetService';
import type { AnalysisHistory } from '../../ai/context';
import type { AnalysisOutput, StoredDataset, StoredModel } from '../../db/mappers';
import { TASK_TIMEOUT_MS, AVA_ENGINE_OPTIONS } from '../../config';

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
    const analysisSignal = AbortSignal.any([abortController.signal, AbortSignal.timeout(TASK_TIMEOUT_MS)]);
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
      });
      executionStarted = true;
      this.workspaceChanged();
      return task.id;
    } finally {
      if (!executionStarted) this.activeExecutions.delete(conversation.id);
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
    if (recoveredTask) this.workspaceChanged();
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
    try {
      const languageModel = this.models.model(modelProfile, analysisSignal);
      analysisOutput = await withAVA(
        {
          model: languageModel,
          signal: analysisSignal,
        },
        async (ava) => {
          const result = await runAgent(
            ava,
            languageModel,
            task.question,
            resolvedStrategy,
            conversationHistory,
            analysisSignal,
            (preview) => {
              task.preview = preview;
              taskProgress.schedule(task);
            },
            { dataset, connections: this.connections },
          );
          analysisSignal.throwIfAborted();
          await this.datasets.assertFileUnchanged(dataset);
          analysisSignal.throwIfAborted();
          return result;
        },
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
      task.error = error instanceof Error ? error.message : String(error);
      if (analysisOutput) task.error = '分析结果保存失败，请检查磁盘空间。';
      if (analysisSignal.aborted)
        task.error = `分析超过 ${TASK_TIMEOUT_MS / 60000} 分钟，已停止模型请求。请缩小范围后重试。`;
      if (abortController.signal.aborted) task.error = '分析已取消';
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
      this.workspaceChanged();
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
      detail: `已取消模型请求，等待正在执行的查询和连接释放。查询超时上限为 ${AVA_ENGINE_OPTIONS.queryTimeoutMs / 1000} 秒。`,
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
