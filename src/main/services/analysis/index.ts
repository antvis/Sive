import { isTextUIPart } from 'ai';
import type { UIMessageChunk } from 'ai';
import { isAnalysisToolResult } from '@shared/analysis-trace';
import type {
  AnalysisSession,
  AnalysisReplay,
  AnalysisStartInput,
  AnalysisChunk,
  AnalysisStatus,
  ChatMessage,
  DuckDBEngineConfig,
  Preferences,
} from '@shared/api';
import type { AnalysisOptions } from '@shared/schema';
import { createAnalysisAgent } from '../../ai';
import type { AnalysisAgent } from '../../ai';
import { generateConversationTitle } from '../../ai/completions';
import type { Repositories } from '../../db/repository';
import type { DBConnection } from '../../db/repository/db-connection';
import { errorText, required } from '../../util';
import type { ModelConfig } from '../model';
import type { DatasetRow } from '../../db/schema/datasets';
import { checkLocalFile, localFilePath } from '../../util/localFile';

type Task = AnalysisReplay & {
  datasetId: string;
  controller: AbortController;
};

export class AnalysisService {
  // Add a Map to store agents associated with conversation IDs, along with their dataset IDs and engine keys.
  // This allows for efficient retrieval and management of agents during analysis tasks.
  // When the engine key changes, the existing agent is disposed of and a new one is created to ensure that the analysis uses the correct engine configuration.
  private agents = new Map<
    string,
    {
      dataset: Pick<DatasetRow, 'id' | 'name'>;
      engineKey: string;
      agent: Promise<AnalysisAgent>;
    }
  >();

  private tasks = new Map<string, Task>();

  private chunkListener?: (id: string, update: AnalysisChunk) => void;

  private statusListener?: (id: string, update: AnalysisStatus) => void;

  private updatingDatasets = new Set<string>();

  constructor(
    private database: DBConnection,
    private repositories: Repositories,
  ) {}

  onChunk(listener: (id: string, update: AnalysisChunk) => void) {
    this.chunkListener = listener;
  }

  onStatus(listener: (id: string, update: AnalysisStatus) => void) {
    this.statusListener = listener;
  }

  getRunningConversationIds() {
    return [...this.tasks.keys()];
  }

  assertNotRunning(ids: string[]) {
    if (ids.some((id) => this.tasks.has(id))) throw new Error('分析仍在运行，请先恢复会话并停止任务。');
  }

  private publish(conversationId: string, task: Task, chunk: UIMessageChunk | null) {
    const sequence = task.chunks.length + 1;
    if (chunk) task.chunks.push(chunk);
    this.chunkListener?.(conversationId, { runId: task.runId, sequence, chunk });
  }

  getSession(conversationId: string): AnalysisSession {
    const task = this.tasks.get(conversationId);
    return {
      messages: this.getMessages(conversationId),
      stream: task ? { runId: task.runId, chunks: [...task.chunks] } : null,
    };
  }

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
    const entries = [...this.agents.entries()].filter(([, entry]) => entry.dataset.id === datasetId);
    for (const [id] of entries) this.agents.delete(id);
    const results = await Promise.allSettled(entries.map(async ([, entry]) => (await entry.agent).dispose()));
    const failed = results.find((result) => result.status === 'rejected');
    if (failed) throw failed.reason;
  }

  getMessages(conversationId: string): ChatMessage[] {
    required(this.repositories.conversations.get(conversationId), '会话不存在。');
    return this.repositories.messages
      .listByConversationId(conversationId)
      .map(({ id, role, parts, createdAt }) => ({ id, role, parts, metadata: { createdAt } }));
  }

  start(input: AnalysisStartInput, model: ModelConfig, preferences: Preferences) {
    const question = input.message.parts
      .filter(isTextUIPart)
      .map((part) => part.text)
      .join('')
      .trim();
    if (!question) throw new Error('请输入分析问题。');
    if (this.updatingDatasets.has(input.datasetId)) throw new Error('数据源正在更新，请稍后重试。');
    const dataset = required(this.repositories.datasets.get(input.datasetId), '数据源不存在或已删除。');
    if (this.tasks.has(input.chatId)) throw new Error('请等待当前分析完成。');
    const now = new Date().toISOString();
    const analysisOptions = { strategy: input.strategy, model: model.model };
    const { conversation, shouldName } = this.database.write(() => {
      const existing = this.repositories.conversations.get(input.chatId);
      const conversation =
        existing ??
        this.repositories.conversations.insert({
          id: input.chatId,
          datasetId: dataset.id,
          title: question,
          createdAt: now,
          updatedAt: now,
        });
      if (conversation.datasetId !== dataset.id) throw new Error('会话与数据集不匹配。');

      const sequence = this.repositories.messages.nextSequence(conversation.id);
      const needsInitialTitle = sequence === 0 && existing?.title === '新建分析';
      this.repositories.messages.insert({
        id: input.message.id,
        conversationId: conversation.id,
        sequence,
        role: 'user',
        parts: input.message.parts,
        analysisOptions,
        createdAt: now,
        updatedAt: now,
      });
      if (existing) {
        this.repositories.conversations.update(conversation.id, {
          ...(needsInitialTitle ? { title: question } : {}),
          updatedAt: now,
        });
      }
      return { conversation, shouldName: !existing || needsInitialTitle };
    });
    const agent = this.getAgent(conversation.id, model, dataset, preferences.engine);
    const task: Task = {
      runId: input.message.id,
      datasetId: dataset.id,
      controller: new AbortController(),
      chunks: [],
    };
    this.tasks.set(conversation.id, task);
    this.statusListener?.(conversation.id, { runId: task.runId, status: 'running' });
    void this.run(
      conversation.id,
      agent,
      analysisOptions,
      preferences.agent,
      task,
      localFilePath(dataset.sourceConfig),
    );

    if (shouldName) return this.nameConversation(conversation.id, question, model);
  }

  private async nameConversation(conversationId: string, question: string, model: ModelConfig) {
    try {
      const title = await generateConversationTitle(question, model);
      if (!title || title === question) return false;
      return this.repositories.conversations.updateTitleIfCurrent(conversationId, question, title);
    } catch (error) {
      console.warn(
        '[conversation-title] Automatic naming failed:',
        error instanceof Error ? error.name : 'UnknownError',
      );
      return false;
    }
  }

  cancel(conversationId: string) {
    this.tasks.get(conversationId)?.controller.abort();
  }

  private getAgent(
    conversationId: string,
    model: ModelConfig,
    dataset: DatasetRow,
    engine: DuckDBEngineConfig,
  ): Promise<AnalysisAgent> {
    const credentialKey =
      dataset.sourceConfig.type === 'supabase' ? dataset.sourceConfig.options.accessToken : '';
    const engineKey = JSON.stringify([engine, credentialKey]);
    const existing = this.agents.get(conversationId);
    if (existing?.engineKey === engineKey) return existing.agent;
    // If the engine key has changed, dispose of the existing agent and create a new one, ensuring that the analysis uses the correct engine configuration,
    //  and keep the old agent in the map until the new one is created to avoid race conditions, or interupting an ongoing analysis task that is using the old agent.
    if (existing) {
      this.agents.delete(conversationId);
      void existing.agent.then((agent) => agent.dispose()).catch(() => {});
    }

    const agent = createAnalysisAgent({ context: { dataset }, model, engine }).catch((error) => {
      this.agents.delete(conversationId);
      throw error;
    });
    this.agents.set(conversationId, { dataset, engineKey, agent });
    return agent;
  }

  private async run(
    conversationId: string,
    agentPromise: Promise<AnalysisAgent>,
    analysisOptions: Required<AnalysisOptions>,
    agentConfig: Preferences['agent'],
    task: Task,
    file?: string,
  ) {
    const { controller } = task;
    let terminal: string | null = null;
    try {
      const agent = await agentPromise;
      if (file) await checkLocalFile(file);
      controller.signal.throwIfAborted();
      const createdAt = new Date().toISOString();
      const stream = await agent.stream({
        messages: this.getMessages(conversationId),
        createdAt,
        toolOptions: { strategy: analysisOptions.strategy },
        agent: agentConfig,
        abortSignal: controller.signal,
        onEnd: ({ responseMessage, outcome, isAborted }) => {
          if (isAborted) controller.abort();
          const cancelled = controller.signal.aborted;
          const completed = !cancelled && outcome.status === 'completed';
          const parts = completed
            ? responseMessage.parts
            : responseMessage.parts.filter(
                (part) =>
                  part.type === 'tool-analyze' &&
                  part.state === 'output-available' &&
                  isAnalysisToolResult(part.output) &&
                  part.output.trace !== undefined,
              );
          if (completed || parts.length) {
            this.database.write(() => {
              this.repositories.messages.insert({
                id: responseMessage.id,
                conversationId,
                sequence: this.repositories.messages.nextSequence(conversationId),
                role: 'assistant',
                parts,
                analysisOptions,
                createdAt,
                updatedAt: new Date().toISOString(),
              });
              this.repositories.conversations.update(conversationId, {});
            });
          }
          if (cancelled) return;
          if (outcome.status === 'failed') throw outcome.error ?? new Error('分析失败，请重试。');
          if (!completed) throw new Error('分析流意外结束。');
        },
      });
      for await (const chunk of stream) {
        // Send terminal chunks only after persistence and resource cleanup finish.
        if (chunk.type === 'error') terminal = chunk.errorText;
        else if (chunk.type === 'abort') controller.abort();
        else this.publish(conversationId, task, chunk);
      }
      controller.signal.throwIfAborted();
    } catch (error) {
      terminal = errorText(error);
    }
    const status = controller.signal.aborted ? 'stopped' : terminal ? 'failed' : 'completed';
    if (status !== 'completed') {
      this.agents.delete(conversationId);
      await agentPromise.then((agent) => agent.dispose()).catch(() => {});
    }
    this.tasks.delete(conversationId);
    if (status === 'stopped') this.publish(conversationId, task, { type: 'abort' });
    else if (terminal) this.publish(conversationId, task, { type: 'error', errorText: terminal });
    this.publish(conversationId, task, null);
    this.statusListener?.(conversationId, { runId: task.runId, status });
  }
}
