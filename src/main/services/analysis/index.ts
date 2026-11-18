import { randomUUID } from 'node:crypto';
import type { ModelMessage, TextStreamPart, ToolSet } from 'ai';
import type { AnalysisStartInput, AnalysisTaskEvent, DuckDBEngineConfig, Preferences } from '@shared/api';
import { createAnalysisAgent } from '../../ai';
import type { AnalysisAgent } from '../../ai';
import type { Repositories } from '../../db/repository';
import type { DBConnection } from '../../db/repository/db-connection';
import { required } from '../../util';
import type { ModelConfig } from '../model';
import type { DatasetRow } from '../../db/schema/datasets';
import { checkLocalFile, localFilePath } from '../../util/localFile';

type Task = { conversationId: string; datasetId: string; controller: AbortController };
type Emit = (event: AnalysisTaskEvent) => void;

export class AnalysisService {
  // Add a Map to store agents associated with conversation IDs, along with their dataset IDs and engine keys.
  // This allows for efficient retrieval and management of agents during analysis tasks.
  // When the engine key changes, the existing agent is disposed of and a new one is created to ensure that the analysis uses the correct engine configuration.
  private agents = new Map<string, {
    datasetId: string;
    engineKey: string;
    agent: Promise<AnalysisAgent>,
  }>();

  private tasks = new Map<string, Task>();

  private updatingDatasets = new Set<string>();

  constructor(
    private database: DBConnection,
    private repositories: Repositories,
  ) {}

  async beginDatasetUpdate(datasetId: string) {
    if (this.updatingDatasets.has(datasetId)) throw new Error('数据源正在更新，请稍后重试。');
    if ([...this.tasks.values()].some((task) => task.datasetId === datasetId))
      throw new Error('该数据源正在分析，请等待分析结束后刷新。');
    this.updatingDatasets.add(datasetId);
    try {
      await this.disposeDatasetAgents(datasetId);
    } catch (error) {
      this.endDatasetUpdate(datasetId);
      throw error;
    }
  }

  endDatasetUpdate(datasetId: string) {
    this.updatingDatasets.delete(datasetId);
  }

  private async disposeDatasetAgents(datasetId: string) {
    const entries = [...this.agents.entries()].filter(([, entry]) => entry.datasetId === datasetId);
    for (const [id] of entries) this.agents.delete(id);
    const results = await Promise.allSettled(entries.map(async ([, entry]) => (await entry.agent).dispose()));
    const failed = results.find((result) => result.status === 'rejected');
    if (failed) throw failed.reason;
  }

  getMessages(conversationId: string) {
    required(this.repositories.conversations.get(conversationId), '会话不存在。');
    return this.repositories.messages.listByConversationId(conversationId);
  }

  recoverAfterRestart() {
    this.repositories.messages.interruptRunning();
  }

  getRun(id: string) {
    return required(this.repositories.messages.get(id), '分析记录不存在。');
  }

  start(input: AnalysisStartInput, model: ModelConfig, preferences: Preferences, emit: Emit) {
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
    const agent = this.getAgent(conversation.id, model, dataset, preferences.engine);
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
      preferences.agent,
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

  private getAgent(
    conversationId: string,
    model: ModelConfig,
    dataset: DatasetRow,
    engine: DuckDBEngineConfig,
  ): Promise<AnalysisAgent> {
    const engineKey = JSON.stringify(engine);
    const existing = this.agents.get(conversationId);
    if (existing?.engineKey === engineKey) return existing.agent;
    // If the engine key has changed, dispose of the existing agent and create a new one, ensuring that the analysis uses the correct engine configuration,
    //  and keep the old agent in the map until the new one is created to avoid race conditions, or interupting an ongoing analysis task that is using the old agent.
    if (existing) {
      this.agents.delete(conversationId);
      void existing.agent.then((agent) => agent.dispose()).catch(() => {});
    }

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

      return createAnalysisAgent({ dataset, model, history, engine });
    })().catch((error) => {
      this.agents.delete(conversationId);
      throw error;
    });
    this.agents.set(conversationId, { datasetId: dataset.id, engineKey, agent });
    return agent;
  }

  private async run(
    taskId: string,
    agentPromise: Promise<AnalysisAgent>,
    question: string,
    strategy: AnalysisStartInput['strategy'],
    agentConfig: Preferences['agent'],
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
        agent: agentConfig,
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
