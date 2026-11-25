import type { ChatTransport, UIMessageChunk } from 'ai';
import type { AnalysisChunk, AnalysisReplay, AnalysisStartInput, ChatMessage } from '../../../shared/api';

export class IpcChatTransport implements ChatTransport<ChatMessage> {
  readonly resumeStreamIsReplay = true;

  private connections = new Set<() => void>();

  private started?: Promise<unknown>;

  constructor(
    private onConversationChange: (id: string) => void,
    private onHistory: (messages: ChatMessage[]) => void,
  ) {}

  async stop(chatId: string) {
    await this.started;
    await window.workbench.analysisCancel(chatId);
  }

  close() {
    for (const detach of this.connections) detach();
  }

  async sendMessages({
    chatId,
    messages,
    body,
    abortSignal,
    trigger,
  }: Parameters<ChatTransport<ChatMessage>['sendMessages']>[0]) {
    if (trigger !== 'submit-message') throw new Error('暂不支持重新生成消息。');
    const connection = this.connect(chatId, abortSignal, async () => {
      const input = { ...body, chatId, message: messages.at(-1) } as AnalysisStartInput;
      await window.workbench.analysisStart(input);
      // Register a successfully created conversation even if its view has detached.
      this.onConversationChange(chatId);
      return { stream: { runId: input.message.id, chunks: [] } };
    });
    this.started = connection;
    const stream = await connection;
    return stream ?? new ReadableStream<UIMessageChunk>({ start: (controller) => controller.close() });
  }

  reconnectToStream({ chatId, abortSignal }: Parameters<ChatTransport<ChatMessage>['reconnectToStream']>[0]) {
    return this.connect(chatId, abortSignal, () => window.workbench.analysisGetSession(chatId));
  }

  private async connect(
    chatId: string,
    signal: AbortSignal | undefined,
    load: () => Promise<{ messages?: ChatMessage[]; stream: AnalysisReplay | null }>,
  ): Promise<ReadableStream<UIMessageChunk> | null> {
    signal?.throwIfAborted();
    let active = true;
    let ready = false;
    let runId: string;
    let sequence = 0;
    const pending: AnalysisChunk[] = [];
    let controller: ReadableStreamDefaultController<UIMessageChunk>;
    const stream = new ReadableStream<UIMessageChunk>({
      start: (value) => {
        controller = value;
      },
      cancel: () => cleanup(),
    });

    const cleanup = () => {
      if (!active) return;
      active = false;
      unsubscribe();
      signal?.removeEventListener('abort', detach);
      this.connections.delete(detach);
    };

    const detach = () => {
      if (!active) return;
      cleanup();
      controller.close();
    };

    const accept = (update: AnalysisChunk) => {
      if (!active || update.runId !== runId || update.sequence <= sequence) return;
      sequence = update.sequence;
      if (update.chunk === null) detach();
      else controller.enqueue(update.chunk);
    };
    // Subscribe before requesting the replay. Sequence numbers remove overlap
    // between the snapshot and events received while the IPC request is pending.
    const unsubscribe = window.workbench.analysisOnChunk((id, update) => {
      if (id !== chatId || !active) return;
      if (ready) accept(update);
      else pending.push(update);
    });
    this.connections.add(detach);
    signal?.addEventListener('abort', detach, { once: true });

    try {
      const session = await load();
      if (!active) return null;
      if (session.messages) this.onHistory(session.messages);
      if (!session.stream) {
        detach();
        return null;
      }
      runId = session.stream.runId;
      for (const chunk of session.stream.chunks) controller!.enqueue(chunk);
      sequence = session.stream.chunks.length;
      ready = true;
      for (const update of pending) accept(update);
      pending.length = 0;
      return stream;
    } catch (error) {
      detach();
      throw error;
    }
  }
}
