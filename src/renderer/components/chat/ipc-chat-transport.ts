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
    abortSignal?.throwIfAborted();

    let cancelStream = () => {};

    return new ReadableStream<UIMessageChunk>({
      start: (controller) => {
        startConversation(chatId);
        let finished = false;
        let stopping = false;

        const requestStop = () => {
          if (stopping) return;
          stopping = true;
          started
            .then(() => window.workbench.analysisCancel(chatId))
            .catch((error) => {
              stopping = false;
              this.onError(error);
            });
        };

        const cleanup = (resultId?: string) => {
          finishConversation(chatId, resultId);
          finished = true;
          if (this.stopByChat.get(chatId) === requestStop) this.stopByChat.delete(chatId);
          unsubscribe();
          abortSignal?.removeEventListener('abort', abort);
        };
        cancelStream = () => {
          if (finished) return;
          cleanup();
        };

        const abort = () => {
          if (finished) return;
          cancelStream();
          controller.close();
        };
        const unsubscribe = window.workbench.analysisOnChunk((messageId, chunk) => {
          if (finished || messageId !== input.message.id) return;
          if (chunk === null) {
            cleanup(stopping ? undefined : input.message.id);
            controller.close();
          } else {
            controller.enqueue(chunk);
            if (chunk.type === 'error' || chunk.type === 'abort') {
              cleanup(chunk.type === 'error' && !stopping ? input.message.id : undefined);
              controller.close();
            }
          }
        });
        abortSignal?.addEventListener('abort', abort, { once: true });
        const started = window.workbench.analysisStart(input);
        this.stopByChat.set(chatId, requestStop);
        started.then(
          () => {
            if (!abortSignal?.aborted) this.onConversationChange(chatId);
          },
          (error: unknown) => {
            if (finished) return;
            cleanup(input.message.id);
            controller.error(error);
          },
        );
      },
      cancel: () => cancelStream(),
    });
  }

  async reconnectToStream({
    chatId,
    abortSignal,
  }: Parameters<ChatTransport<ChatMessage>['reconnectToStream']>[0]) {
    abortSignal?.throwIfAborted();
    let finished = false;
    let stopping = false;
    let messageId: string | undefined;

    let cancelStream = () => {};

    let cleanupStream = (_resultId?: string) => {};

    let handleChunk = (_id: string, _chunk: UIMessageChunk | null) => {};

    let unsubscribe = () => {};
    let streamController!: ReadableStreamDefaultController<UIMessageChunk>;
    const pending: [string, UIMessageChunk | null][] = [];

    const stream = new ReadableStream<UIMessageChunk>({
      start: (controller) => {
        streamController = controller;

        const requestStop = () => {
          if (stopping) return;
          stopping = true;
          window.workbench.analysisCancel(chatId).catch((error) => {
            stopping = false;
            this.onError(error);
          });
        };
        cleanupStream = (resultId?: string) => {
          finishConversation(chatId, resultId);
          finished = true;
          if (this.stopByChat.get(chatId) === requestStop) this.stopByChat.delete(chatId);
          unsubscribe();
          abortSignal?.removeEventListener('abort', abort);
        };
        handleChunk = (id: string, chunk: UIMessageChunk | null) => {
          if (finished || id !== messageId) return;
          if (chunk === null) {
            cleanupStream(stopping ? undefined : messageId);
            controller.close();
          } else {
            controller.enqueue(chunk);
            if (chunk.type === 'error' || chunk.type === 'abort') {
              cleanupStream(chunk.type === 'error' && !stopping ? messageId : undefined);
              controller.close();
            }
          }
        };
        cancelStream = () => {
          if (finished) return;
          cleanupStream();
        };

        const abort = () => {
          if (finished) return;
          cancelStream();
          controller.close();
        };
        unsubscribe = window.workbench.analysisOnChunk((id, chunk) => {
          if (finished) return;
          if (messageId) handleChunk(id, chunk);
          else pending.push([id, chunk]);
        });
        abortSignal?.addEventListener('abort', abort, { once: true });
        this.stopByChat.set(chatId, requestStop);
      },
      cancel: () => cancelStream(),
    });

    try {
      const snapshot = await window.workbench.analysisReconnect(chatId);
      if (finished || abortSignal?.aborted) return null;
      if (!snapshot) {
        cleanupStream();
        streamController.close();
        return null;
      }
      messageId = snapshot.messageId;
      startConversation(chatId);
      for (const chunk of snapshot.chunks) handleChunk(messageId, chunk);
      for (const [id, chunk] of pending.splice(0)) handleChunk(id, chunk);
      return stream;
    } catch (error) {
      if (!finished) {
        cleanupStream();
        streamController.error(error);
      }
      throw error;
    }
  }
}
