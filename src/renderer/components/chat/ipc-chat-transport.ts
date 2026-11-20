import type { ChatTransport, UIMessageChunk } from 'ai';
import { analysisStartSchema } from '../../../shared/api';
import type { ChatMessage } from '../../../shared/api';

export class IpcChatTransport implements ChatTransport<ChatMessage> {
  constructor(
    private onConversationChange: (id: string) => void,
    private onError: (error: unknown) => void,
  ) {}

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
        let finished = false;

        const cleanup = () => {
          finished = true;
          unsubscribe();
          abortSignal?.removeEventListener('abort', abort);
        };
        cancelStream = () => {
          if (finished) return;
          cleanup();
          void started.then(() => window.workbench.analysisCancel(chatId)).catch(this.onError);
        };

        const abort = () => {
          if (finished) return;
          cancelStream();
          controller.close();
        };
        const unsubscribe = window.workbench.analysisOnChunk((messageId, chunk) => {
          if (finished || messageId !== input.message.id) return;
          if (chunk === null) {
            cleanup();
            controller.close();
          } else {
            controller.enqueue(chunk);
            if (chunk.type === 'error' || chunk.type === 'abort') {
              cleanup();
              controller.close();
            }
          }
        });
        abortSignal?.addEventListener('abort', abort, { once: true });
        const started = window.workbench.analysisStart(input);
        started.then(
          () => {
            if (!abortSignal?.aborted) this.onConversationChange(chatId);
          },
          (error: unknown) => {
            if (finished) return;
            cleanup();
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
