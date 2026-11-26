import type { ChatTransport, UIMessageChunk } from 'ai';
import { analysisStartSchema } from '../../../shared/api';
import type { ChatMessage } from '../../../shared/api';
import { startConversation, finishConversation } from '../../hooks/useConversationStatus';

export class IpcChatTransport implements ChatTransport<ChatMessage> {
  readonly resumeStreamIsReplay = true;

  private readonly stopByChat = new Map<string, () => void>();

  constructor(
    private onConversationChange: (id: string) => void,
    private onError: (error: unknown) => void,
  ) {}

  stop(chatId: string) {
    this.stopByChat.get(chatId)?.();
  }

  async sendMessages({
    chatId,
    messages,
    body,
    abortSignal,
    trigger,
  }: Parameters<ChatTransport<ChatMessage>['sendMessages']>[0]) {
    if (trigger !== 'submit-message') throw new Error('暂不支持重新生成消息。');
    const input = await analysisStartSchema.parseAsync({ ...body, chatId, message: messages.at(-1) });
    const { stream } = this.subscribe(
      chatId,
      abortSignal,
      async (subscriptionId) => {
        await window.workbench.analysisStart(input, subscriptionId);
        if (!abortSignal?.aborted) this.onConversationChange(chatId);
        return true;
      },
      input.message.id,
    );
    return stream;
  }

  async reconnectToStream({
    chatId,
    abortSignal,
  }: Parameters<ChatTransport<ChatMessage>['reconnectToStream']>[0]) {
    const { stream, connected } = this.subscribe(chatId, abortSignal, (subscriptionId) =>
      window.workbench.analysisReconnect(chatId, subscriptionId),
    );
    return (await connected) && !abortSignal?.aborted ? stream : null;
  }

  private subscribe(
    chatId: string,
    abortSignal: AbortSignal | undefined,
    connect: (subscriptionId: string) => Promise<boolean>,
    sentMessageId?: string,
  ) {
    abortSignal?.throwIfAborted();
    const subscriptionId = crypto.randomUUID();
    let finished = false;
    let stopping = false;
    let running = false;
    let controller: ReadableStreamDefaultController<UIMessageChunk> | undefined;
    const stream = new ReadableStream<UIMessageChunk>({
      start: (streamController) => {
        controller = streamController;
      },
      cancel: () => {
        detach();
      },
    });

    const markRunning = () => {
      if (running) return;
      running = true;
      startConversation(chatId);
    };

    const detach = () => {
      const streamController = controller;
      if (!streamController) return;
      controller = undefined;
      abortSignal?.removeEventListener('abort', onAbort);
      if (this.stopByChat.get(chatId) === requestStop) this.stopByChat.delete(chatId);
      return streamController;
    };

    const onAbort = () => detach()?.close();

    const endSubscription = (reason: 'finished' | 'replaced', resultId?: string) => {
      finished = true;
      unsubscribe();
      if (reason === 'finished' && running) finishConversation(chatId, resultId);
      return detach();
    };

    const unsubscribe = window.workbench.analysisOnChunk((id, messageId, chunk) => {
      if (finished || id !== subscriptionId) return;
      if (chunk === 'replaced') {
        endSubscription('replaced')?.close();
        return;
      }
      markRunning();
      // A detached view still tracks task completion for the conversation status.
      if (chunk !== null) controller?.enqueue(chunk);
      if (chunk === null || chunk.type === 'error' || chunk.type === 'abort') {
        const resultId = !stopping && chunk?.type !== 'abort' ? messageId : undefined;
        endSubscription('finished', resultId)?.close();
      }
    });
    const connected = Promise.resolve().then(() => Boolean(controller) && connect(subscriptionId));

    const requestStop = () => {
      if (stopping) return;
      stopping = true;
      void connected
        .then((attached) => {
          if (attached && !finished) return window.workbench.analysisCancel(chatId);
        })
        .catch((error) => {
          if (finished) return;
          stopping = false;
          this.onError(error);
        });
    };
    this.stopByChat.set(chatId, requestStop);
    abortSignal?.addEventListener('abort', onAbort, { once: true });
    if (sentMessageId) markRunning();

    void connected.then(
      (attached) => {
        if (finished) return;
        if (attached) {
          markRunning();
        } else {
          endSubscription('finished')?.close();
        }
      },
      (error: unknown) => {
        if (finished) return;
        endSubscription('finished', sentMessageId)?.error(error);
      },
    );
    return { stream, connected };
  }
}
