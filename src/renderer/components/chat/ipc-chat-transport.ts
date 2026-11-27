import type { ChatTransport, UIMessageChunk } from 'ai';
import { analysisStartSchema } from '../../../shared/api';
import type { ChatMessage } from '../../../shared/api';

export class IpcChatTransport implements ChatTransport<ChatMessage> {
  readonly resumeStreamIsReplay = true;

  private readonly stopByChat = new Map<string, () => void>();

  constructor(
    private onConversationChange: (id: string) => void,
    private onError: (error: unknown) => void,
  ) {}

  stop(chatId: string) {
    const stop = this.stopByChat.get(chatId);
    if (stop) stop();
    else void window.workbench.analysisCancel(chatId).catch(this.onError);
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
    const { stream } = this.subscribe(chatId, abortSignal, async (subscriptionId) => {
      await window.workbench.analysisStart(input, subscriptionId);
      if (!abortSignal?.aborted) this.onConversationChange(chatId);
      return true;
    });
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
  ) {
    abortSignal?.throwIfAborted();
    const subscriptionId = crypto.randomUUID();
    let finished = false;
    let stopping = false;
    let controller: ReadableStreamDefaultController<UIMessageChunk> | undefined;
    const stream = new ReadableStream<UIMessageChunk>({
      start: (streamController) => {
        controller = streamController;
      },
      cancel: () => {
        detach();
      },
    });

    const detach = () => {
      const streamController = controller;
      if (!streamController) return;
      controller = undefined;
      finished = true;
      unsubscribe();
      abortSignal?.removeEventListener('abort', onAbort);
      if (this.stopByChat.get(chatId) === requestStop) this.stopByChat.delete(chatId);
      return streamController;
    };

    const onAbort = () => detach()?.close();

    const unsubscribe = window.workbench.analysisOnChunk((id, _messageId, chunk) => {
      if (finished || id !== subscriptionId) return;
      if (chunk === 'replaced') {
        detach()?.close();
        return;
      }
      if (chunk !== null) controller?.enqueue(chunk);
      if (chunk === null || chunk.type === 'error' || chunk.type === 'abort') {
        detach()?.close();
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

    void connected.then(
      (attached) => {
        if (finished) return;
        if (!attached) detach()?.close();
      },
      (error: unknown) => {
        if (finished) return;
        detach()?.error(error);
      },
    );
    return { stream, connected };
  }
}
