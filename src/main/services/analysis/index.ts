import { randomUUID } from 'node:crypto';
import type { ModelMessage, TextStreamPart, ToolSet } from 'ai';
import { createAnalysisAgent } from '../../ai';
import type { Repositories } from '../../db/repository';
import type { DBConnection } from '../../db/repository/db-connection';
import { required } from '../../util';
import type { ModelService } from '../model';
import type { datasets } from '../../db/schema/datasets';
import { checkLocalFile, localFilePath } from '../../util/localFile';

type ModelConfig = ReturnType<ModelService['getDefaultModelConfig']>;
type AgentPromise = ReturnType<typeof createAnalysisAgent>;
type DatasetRow = typeof datasets.$inferSelect;
type StartInput = {
  datasetId: string;
  question: string;
  strategy: 'direct' | 'loop';
  conversationId?: string;
};
type TaskEvent = {
  taskId: string;
  datasetId: string;
  conversationId: string;
  status: 'running' | 'done' | 'error' | 'cancelled';
  stage?: string;
  error?: string;
  part?: TextStreamPart<ToolSet>;
};
type Task = { conversationId: string; datasetId: string; controller: AbortController };
type Emit = (event: TaskEvent) => void;

export class AnalysisService {
  private agents = new Map<string, { datasetId: string; promise: AgentPromise }>();

  private tasks = new Map<string, Task>();

  private updatingDatasets = new Set<string>();

  constructor(
    private database: DBConnection,
    private repositories: Repositories,
  ) {}

  async withDatasetUpdate<T>(datasetId: string, update: () => Promise<T>): Promise<T> {
    if (this.updatingDatasets.has(datasetId)) throw new Error('数据源正在更新，请稍后重试。');
    if ([...this.tasks.values()].some((task) => task.datasetId === datasetId))
      throw new Error('该数据源正在分析，请等待分析结束后更新或重新定位。');
    this.updatingDatasets.add(datasetId);
    try {
      await this.disposeDatasetAgents(datasetId);
      return await update();
    } finally {
      this.updatingDatasets.delete(datasetId);
    }
  }

  private async disposeDatasetAgents(datasetId: string) {
    const entries = [...this.agents.entries()].filter(([, entry]) => entry.datasetId === datasetId);
    for (const [id] of entries) this.agents.delete(id);
    const results = await Promise.allSettled(
      entries.map(async ([, entry]) => (await entry.promise).dispose()),
    );
    const failed = results.find((result) => result.status === 'rejected');
    if (failed) throw failed.reason;
  }

  getMessages(conversationId: string) {
    required(this.repositories.conversations.get(conversationId), '会话不存在。');
    return this.repositories.messages.listByConversationId(conversationId);
  }

  getRun(id: string) {
    return required(this.repositories.messages.get(id), '分析记录不存在。');
  }

  start(input: StartInput, model: ModelConfig, emit: Emit) {
    const question = input.question.trim();
    if (!question) throw new Error('请输入分析问题。');
    if (this.updatingDatasets.has(input.datasetId)) throw new Error('数据源正在更新，请稍后重试。');
    const dataset = required(this.repositories.datasets.get(input.datasetId), '数据源不存在或已删除。');
    for (const task of this.tasks.values()) {
      if (task.conversationId === input.conversationId) throw new Error('请等待当前分析完成。');
    }
    const now = new Date().toISOString();
    const conversation =
      (input.conversationId ? this.repositories.conversations.get(input.conversationId) : undefined) ??
      this.database.write(() =>
        this.repositories.conversations.insert({
          id: randomUUID(),
          datasetId: dataset.id,
          title: question,
          createdAt: now,
          updatedAt: now,
        }),
      );
    if (conversation.datasetId !== dataset.id) throw new Error('会话与数据集不匹配。');
    const agent = this.getAgent(conversation.id, model, dataset);
    const sequence = this.repositories.messages.nextSequence(conversation.id);
    const taskId = randomUUID();

    this.repositories.messages.insert({
      id: randomUUID(),
      conversationId: conversation.id,
      sequence,
      role: 'user',
      status: 'done',
      content: { question },
      analysisOptions: { strategy: input.strategy, model: model.model },
      createdAt: now,
      updatedAt: now,
    });
    this.repositories.messages.insert({
      id: taskId,
      conversationId: conversation.id,
      sequence: sequence + 1,
      role: 'assistant',
      status: 'running',
      content: { stage: '准备分析' },
      analysisOptions: { strategy: input.strategy, model: model.model },
      createdAt: now,
      updatedAt: now,
    });
    this.repositories.conversations.update(conversation.id, {
      title: conversation.title === '新建分析' ? question : conversation.title,
      updatedAt: now,
    });
    const controller = new AbortController();
    this.tasks.set(taskId, { conversationId: conversation.id, datasetId: dataset.id, controller });
    void this.run(
      taskId,
      agent,
      question,
      input.strategy,
      controller,
      emit,
      localFilePath(dataset.sourceConfig),
    );
    return { taskId, conversationId: conversation.id };
  }

  async cancel(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.controller.abort();
    this.repositories.messages.update(taskId, { status: 'cancelled', content: { stage: '已取消' } });
    return { datasetId: task.datasetId, conversationId: task.conversationId };
  }

  private getAgent(conversationId: string, model: ModelConfig, dataset: DatasetRow): AgentPromise {
    const existing = this.agents.get(conversationId);
    if (existing) return existing.promise;
    const agent = (async () => {
      const history = this.repositories.messages
        .listByConversationId(conversationId)
        .filter((message) => message.role === 'user' || message.status === 'done')
        .map((message): ModelMessage => {
          const content = message.content;
          return message.role === 'user'
            ? { role: 'user', content: content.question ?? '' }
            : { role: 'assistant', content: content.text ?? content.query ?? '' };
        });
      return createAnalysisAgent({ dataset, model, history });
    })().catch((error) => {
      this.agents.delete(conversationId);
      throw error;
    });
    this.agents.set(conversationId, { datasetId: dataset.id, promise: agent });
    return agent;
  }

  private async run(
    taskId: string,
    agentPromise: AgentPromise,
    question: string,
    strategy: StartInput['strategy'],
    controller: AbortController,
    emit: Emit,
    file?: string,
  ) {
    const task = required(this.tasks.get(taskId), '分析任务不存在。');
    const eventBase = { taskId, datasetId: task.datasetId, conversationId: task.conversationId };
    try {
      emit({ ...eventBase, status: 'running', stage: '正在加载会话' });
      const agent = await agentPromise;
      if (file) await checkLocalFile(file);
      controller.signal.throwIfAborted();
      emit({ ...eventBase, status: 'running', stage: '正在分析数据' });
      const parts: TextStreamPart<ToolSet>[] = [];
      const result = await agent.stream({
        question,
        strategy,
        abortSignal: controller.signal,
        onPart: (part) => {
          const previous = parts.at(-1);
          if (part.type === 'text-delta' && previous?.type === 'text-delta' && previous.id === part.id) {
            parts[parts.length - 1] = { ...previous, text: previous.text + part.text };
          } else {
            parts.push(part);
          }
          emit({ ...eventBase, status: 'running', part });
        },
      });
      const text = await result.text;
      controller.signal.throwIfAborted();
      this.repositories.messages.update(taskId, {
        status: 'done',
        content: { text, query: question, parts },
      });
      this.repositories.conversations.update(task.conversationId, {});
      emit({ ...eventBase, status: 'done' });
    } catch (error) {
      this.agents.delete(task.conversationId);
      await agentPromise.then((agent) => agent.dispose()).catch(() => {});
      const cancelled = controller.signal.aborted;
      this.repositories.messages.update(taskId, {
        status: cancelled ? 'cancelled' : 'error',
        content: {
          stage: cancelled ? '已取消' : '分析失败',
          error: error instanceof Error ? error.message : String(error),
        },
      });
      emit({
        ...eventBase,
        status: cancelled ? 'cancelled' : 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.tasks.delete(taskId);
    }
  }
}
