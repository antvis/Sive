import { randomUUID } from 'node:crypto';
import type { AnalysisResponse, VisualizeResponse } from '@antv/ava';
import type { ModelMessage } from 'ai';
import { createAnalysisAgent } from '../../ai';
import type { Repositories } from '../../db/repository';
import type { DBConnection } from '../../db/repository/db-connection';
import { required } from '../../util';
import type { ModelService } from '../model';

type ModelConfig = ReturnType<ModelService['getDefaultModelConfig']>;
type AgentPromise = ReturnType<typeof createAnalysisAgent>;
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
};
type Task = { conversationId: string; datasetId: string; controller: AbortController };
type Emit = (event: TaskEvent) => void;

export class AnalysisService {
  private agents = new Map<string, AgentPromise>();

  private tasks = new Map<string, Task>();

  constructor(
    private database: DBConnection,
    private repositories: Repositories,
  ) {}

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
    const agent = this.getAgent(conversation.id, model);
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
    void this.run(taskId, agent, question, input.strategy, controller, emit);
    return { taskId, conversationId: conversation.id };
  }

  async cancel(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.controller.abort();
    this.repositories.messages.update(taskId, { status: 'cancelled', content: { stage: '已取消' } });
    return { datasetId: task.datasetId, conversationId: task.conversationId };
  }

  private getAgent(conversationId: string, model: ModelConfig): AgentPromise {
    const existing = this.agents.get(conversationId);
    if (existing) return existing;
    const agent = (async () => {
      const conversation = required(this.repositories.conversations.get(conversationId), '会话不存在。');
      const dataset = required(
        this.repositories.datasets.get(conversation.datasetId),
        '数据源不存在或已删除。',
      );
      const history = this.repositories.messages
        .listByConversationId(conversationId)
        .filter((message) => message.role === 'user' || message.status === 'done')
        .map((message): ModelMessage => {
          const content = message.content;
          return message.role === 'user'
            ? { role: 'user', content: content.question ?? '' }
            : { role: 'assistant', content: content.text ?? content.query ?? '' };
        });
      return createAnalysisAgent({
        sourceConfig: dataset.sourceConfig,
        semantic: dataset.semantic,
        model,
        history,
      });
    })().catch((error) => {
      this.agents.delete(conversationId);
      throw error;
    });
    this.agents.set(conversationId, agent);
    return agent;
  }

  private async run(
    taskId: string,
    agentPromise: AgentPromise,
    question: string,
    strategy: StartInput['strategy'],
    controller: AbortController,
    emit: Emit,
  ) {
    const task = required(this.tasks.get(taskId), '分析任务不存在。');
    const eventBase = { taskId, datasetId: task.datasetId, conversationId: task.conversationId };
    try {
      emit({ ...eventBase, status: 'running', stage: '正在加载会话' });
      const agent = await agentPromise;
      emit({ ...eventBase, status: 'running', stage: '正在分析数据' });
      const result = await agent.generate({
        question,
        strategy,
        abortSignal: controller.signal,
      });
      const toolResults = result.steps.flatMap((step) => step.toolResults);
      const analysis = toolResults.filter((item) => item.toolName === 'analyze').at(-1)?.output as
        AnalysisResponse | undefined;
      const visualization = toolResults.filter((item) => item.toolName === 'visualize').at(-1)?.output as
        VisualizeResponse | null | undefined;
      this.repositories.messages.update(taskId, {
        status: 'done',
        content: analysis
          ? { ...analysis, chartHtml: visualization?.html }
          : { text: result.text, query: question, data: [], schema: [] },
      });
      this.repositories.conversations.update(task.conversationId, {});
      emit({ ...eventBase, status: 'done' });
    } catch (error) {
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
