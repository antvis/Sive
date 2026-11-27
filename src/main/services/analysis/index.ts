import { i18n } from '../../util/i18n';
import { getMessages } from '@shared/i18n';
import { isTextUIPart } from 'ai';
import type { UIMessageChunk } from 'ai';
import { isAnalysisToolResult } from '@shared/analysis-trace';
import type {
  AnalysisStartInput,
  AnalysisStreamChunk,
  ChatMessage,
  ConversationActivity,
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

type Emit = (chunk: AnalysisStreamChunk) => void;

type AnalysisTask = {
  datasetId: string;
  controller: AbortController;
  messageId: string;
  chunks: UIMessageChunk[];
  emit: Emit;
};

export class AnalysisService {
  // Reuse each conversation's agent until its engine configuration or output language changes.
  private agents = new Map<
    string,
    {
      dataset: Pick<DatasetRow, 'id' | 'name'>;
      engineKey: string;
      language: Preferences['language'];
      agent: Promise<AnalysisAgent>;
    }
  >();

  private tasks = new Map<string, AnalysisTask>();

  private activities = new Map<string, ConversationActivity>();

  onActivityChange: (() => void) | undefined;

  private updatingDatasets = new Set<string>();

  constructor(
    private database: DBConnection,
    private repositories: Repositories,
  ) {}

  async beginDatasetUpdate(datasetId: string) {
    if (this.updatingDatasets.has(datasetId)) throw new Error(i18n('errors.dataset.updateInProgress'));
    if ([...this.tasks.values()].some((task) => task.datasetId === datasetId))
      throw new Error(i18n('errors.dataset.analysisInProgress'));
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
    required(this.repositories.conversations.get(conversationId), i18n('errors.conversation.notFound'));
    return this.repositories.messages
      .listByConversationId(conversationId)
      .map(({ id, role, parts, createdAt }) => ({ id, role, parts, metadata: { createdAt } }));
  }

  getActivities() {
    for (const id of this.activities.keys()) {
      if (!this.repositories.conversations.get(id)) this.activities.delete(id);
    }
    return [...this.activities.values()];
  }

  markRead(conversationId: string, messageId: string) {
    const activity = this.activities.get(conversationId);
    if (activity?.status !== 'unread' || activity.messageId !== messageId) return;
    this.setActivity({ ...activity, status: 'idle' });
  }

  private setActivity(activity: ConversationActivity) {
    this.activities.set(activity.conversationId, activity);
    this.onActivityChange?.();
  }

  start(input: AnalysisStartInput, model: ModelConfig, preferences: Preferences, emit: Emit) {
    const question = input.message.parts
      .filter(isTextUIPart)
      .map((part) => part.text)
      .join('')
      .trim();
    if (!question) throw new Error(i18n('errors.analysis.questionRequired'));
    if (this.updatingDatasets.has(input.datasetId)) throw new Error(i18n('errors.dataset.updateInProgress'));
    const dataset = required(
      this.repositories.datasets.get(input.datasetId),
      i18n('errors.dataset.notFound'),
    );
    if (this.tasks.has(input.chatId)) throw new Error(i18n('errors.analysis.alreadyRunning'));
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
      if (conversation.datasetId !== dataset.id) throw new Error(i18n('errors.conversation.datasetMismatch'));

      const sequence = this.repositories.messages.nextSequence(conversation.id);
      const needsInitialTitle =
        sequence === 0 &&
        (existing?.title === getMessages('zh-CN')['conversation.defaultTitle'] ||
          existing?.title === getMessages('en-US')['conversation.defaultTitle']);
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
    const agent = this.getAgent(conversation.id, model, dataset, preferences.engine, preferences.language);
    const controller = new AbortController();
    const task: AnalysisTask = {
      datasetId: dataset.id,
      controller,
      messageId: input.message.id,
      chunks: [],
      emit,
    };
    this.tasks.set(conversation.id, task);
    this.setActivity({ conversationId: conversation.id, messageId: task.messageId, status: 'running' });
    void this.run(
      conversation.id,
      agent,
      analysisOptions,
      preferences.agent,
      controller,
      (chunk) => {
        if (chunk) task.chunks.push(chunk);
        task.emit(chunk);
      },
      localFilePath(dataset.sourceConfig),
    );

    if (shouldName) return this.nameConversation(conversation.id, question, model, preferences.language);
  }

  private async nameConversation(
    conversationId: string,
    question: string,
    model: ModelConfig,
    language: Preferences['language'],
  ) {
    try {
      const title = await generateConversationTitle(question, model, language);
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

  reconnect(conversationId: string, emit: (messageId: string, chunk: AnalysisStreamChunk) => void) {
    const task = this.tasks.get(conversationId);
    if (!task) return false;
    task.emit('replaced');
    task.emit = (chunk) => emit(task.messageId, chunk);
    // Send the replay before yielding to the producer of live chunks.
    for (const chunk of task.chunks) task.emit(chunk);
    return true;
  }

  private getAgent(
    conversationId: string,
    model: ModelConfig,
    dataset: DatasetRow,
    engine: DuckDBEngineConfig,
    language: Preferences['language'],
  ): Promise<AnalysisAgent> {
    const credentialKey =
      dataset.sourceConfig.type === 'supabase' ? dataset.sourceConfig.options.accessToken : '';
    const engineKey = JSON.stringify([engine, credentialKey]);
    const existing = this.agents.get(conversationId);
    if (existing?.engineKey === engineKey && existing.language === language) return existing.agent;
    if (existing) {
      this.agents.delete(conversationId);
      void existing.agent.then((agent) => agent.dispose()).catch(() => {});
    }

    const agent = createAnalysisAgent({ context: { dataset }, model, engine, language }).catch((error) => {
      this.agents.delete(conversationId);
      throw error;
    });
    this.agents.set(conversationId, { dataset, engineKey, language, agent });
    return agent;
  }

  private async run(
    conversationId: string,
    agentPromise: Promise<AnalysisAgent>,
    analysisOptions: Required<AnalysisOptions>,
    agentConfig: Preferences['agent'],
    controller: AbortController,
    emit: (chunk: UIMessageChunk | null) => void,
    file?: string,
  ) {
    let terminal: Extract<UIMessageChunk, { type: 'error' | 'abort' }> | undefined;
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
          const cancelled = isAborted || controller.signal.aborted;
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
          if (outcome.status === 'failed') throw outcome.error ?? new Error(i18n('errors.analysis.failed'));
          if (!completed) throw new Error(i18n('errors.analysis.streamInterrupted'));
        },
      });
      for await (const chunk of stream) {
        // Keep the renderer subscribed until the final traces have been written to SQLite.
        if (chunk.type === 'error' || chunk.type === 'abort') {
          terminal = chunk;
        } else {
          emit(chunk);
        }
      }
      controller.signal.throwIfAborted();
    } catch (error) {
      this.agents.delete(conversationId);
      await agentPromise.then((agent) => agent.dispose()).catch(() => {});
      terminal = controller.signal.aborted
        ? { type: 'abort' }
        : { type: 'error', errorText: errorText(error) };
    } finally {
      const task = this.tasks.get(conversationId)!;
      this.tasks.delete(conversationId);
      this.setActivity({
        conversationId,
        messageId: task.messageId,
        status: controller.signal.aborted || terminal?.type === 'abort' ? 'idle' : 'unread',
      });
      if (terminal) emit(terminal);
      emit(null);
    }
  }
}
