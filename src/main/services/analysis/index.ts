import type { UIMessageChunk } from 'ai';
import { isTextUIPart } from 'ai';
import type { AnalysisStartInput, ChatMessage, DuckDBEngineConfig, Preferences } from '@shared/api';
import type { AnalysisOptions } from '@shared/schema';
import { createAnalysisAgent } from '../../ai';
import type { AnalysisAgent } from '../../ai';
import type { Repositories } from '../../db/repository';
import type { DBConnection } from '../../db/repository/db-connection';
import { required } from '../../util';
import type { ModelConfig } from '../model';
import type { DatasetRow } from '../../db/schema/datasets';
import { checkLocalFile, localFilePath } from '../../util/localFile';

type Emit = (chunk: UIMessageChunk | null) => void;

export class AnalysisService {
  // Add a Map to store agents associated with conversation IDs, along with their dataset IDs and engine keys.
  // This allows for efficient retrieval and management of agents during analysis tasks.
  // When the engine key changes, the existing agent is disposed of and a new one is created to ensure that the analysis uses the correct engine configuration.
  private agents = new Map<
    string,
    {
      datasetId: string;
      engineKey: string;
      agent: Promise<AnalysisAgent>;
    }
  >();

  private tasks = new Map<string, { datasetId: string; controller: AbortController }>();

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

  getMessages(conversationId: string): ChatMessage[] {
    required(this.repositories.conversations.get(conversationId), '会话不存在。');
    return this.repositories.messages
      .listByConversationId(conversationId)
      .map(({ id, role, parts, createdAt }) => ({ id, role, parts, metadata: { createdAt } }));
  }

  start(input: AnalysisStartInput, model: ModelConfig, preferences: Preferences, emit: Emit) {
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
    const conversation =
      this.repositories.conversations.get(input.chatId) ??
      this.database.write(() =>
        this.repositories.conversations.insert({
          id: input.chatId,
          datasetId: dataset.id,
          title: question,
          createdAt: now,
          updatedAt: now,
        }),
      );
    if (conversation.datasetId !== dataset.id) throw new Error('会话与数据集不匹配。');
    const agent = this.getAgent(conversation.id, model, dataset, preferences.engine);
    const analysisOptions = { strategy: input.strategy, model: model.model };
    this.repositories.messages.insert({
      id: input.message.id,
      conversationId: conversation.id,
      sequence: this.repositories.messages.nextSequence(conversation.id),
      role: 'user',
      parts: input.message.parts,
      analysisOptions,
      createdAt: now,
      updatedAt: now,
    });
    this.repositories.conversations.update(conversation.id, {
      title: conversation.title === '新建分析' ? question : conversation.title,
      updatedAt: now,
    });
    const controller = new AbortController();
    this.tasks.set(conversation.id, { datasetId: dataset.id, controller });
    void this.run(
      conversation.id,
      agent,
      analysisOptions,
      preferences.agent,
      controller,
      emit,
      localFilePath(dataset.sourceConfig),
    );
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

    const agent = createAnalysisAgent({ dataset, model, engine }).catch((error) => {
      this.agents.delete(conversationId);
      throw error;
    });
    this.agents.set(conversationId, { datasetId: dataset.id, engineKey, agent });
    return agent;
  }

  private async run(
    conversationId: string,
    agentPromise: Promise<AnalysisAgent>,
    analysisOptions: Required<AnalysisOptions>,
    agentConfig: Preferences['agent'],
    controller: AbortController,
    emit: Emit,
    file?: string,
  ) {
    try {
      const agent = await agentPromise;
      if (file) await checkLocalFile(file);
      controller.signal.throwIfAborted();
      const createdAt = new Date().toISOString();
      const stream = await agent.stream({
        messages: this.getMessages(conversationId),
        createdAt,
        strategy: analysisOptions.strategy,
        agent: agentConfig,
        abortSignal: controller.signal,
        onEnd: ({ responseMessage, outcome, isAborted }) => {
          if (outcome.status === 'failed') throw outcome.error ?? new Error('分析失败，请重试。');
          if (isAborted || controller.signal.aborted) return;
          if (outcome.status !== 'completed') throw new Error('分析流意外结束。');
          const now = new Date().toISOString();
          this.database.write(() => {
            this.repositories.messages.insert({
              id: responseMessage.id,
              conversationId,
              sequence: this.repositories.messages.nextSequence(conversationId),
              role: 'assistant',
              parts: responseMessage.parts,
              analysisOptions,
              createdAt,
              updatedAt: now,
            });
            this.repositories.conversations.update(conversationId, {});
          });
        },
      });
      for await (const chunk of stream) emit(chunk);
      controller.signal.throwIfAborted();
    } catch (error) {
      this.agents.delete(conversationId);
      await agentPromise.then((agent) => agent.dispose()).catch(() => {});
      emit(
        controller.signal.aborted
          ? { type: 'abort' }
          : {
              type: 'error',
              errorText: error instanceof Error ? error.message : String(error),
            },
      );
    } finally {
      this.tasks.delete(conversationId);
      emit(null);
    }
  }
}
