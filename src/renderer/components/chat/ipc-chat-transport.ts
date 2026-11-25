import type { ChatTransport, UIMessageChunk } from 'ai';
import { analysisStartSchema } from '../../../shared/api';
import type { ChatMessage } from '../../../shared/api';
import { startConversation, finishConversation } from '../../hooks/useConversationStatus';

export class IpcChatTransport implements ChatTransport<ChatMessage> {
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
          requestStop();
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

  async reconnectToStream() {
    return null;
  }
}
