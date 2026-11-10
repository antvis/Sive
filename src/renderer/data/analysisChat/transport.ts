import { createUIMessageStream, type ChatTransport, type InferUIMessageChunk } from 'ai';
import type { API, State, Task } from '@shared/contracts';
import { z } from 'zod';
import { analysisModeSchema } from '@shared/inputSchemas';
import { analysisEntry, type AnalysisMessage } from './messages';
import { errorMessage } from '../../utils/feedback';

export type ChatStarted = { taskId: string; conversationId: string };

type Chunk = InferUIMessageChunk<AnalysisMessage>;

const running = (task: Task) => task.status === 'running' || task.status === 'cancelling';

export class AnalysisChatTransport implements ChatTransport<AnalysisMessage> {
  readonly resumeStreamIsReplay = true;

  state?: State;

  private receive?: (state: State) => void;

  private detach?: () => void;

  private cancellation?: { taskId: string; promise: Promise<void> };

  constructor(
    private api: Pick<API, 'conversationCreate' | 'analysisStart' | 'analysisCancel'>,
    private datasetId: string,
    public conversationId: string,
    private started: (value: ChatStarted) => void,
  ) {}

  sendMessages: ChatTransport<AnalysisMessage>['sendMessages'] = async (options) => {
    if (options.trigger !== 'submit-message') throw new Error('请通过新问题重新发起分析。');
    const { mode } = z.object({ mode: analysisModeSchema }).parse(options.body);
    const question = [...options.messages]
      .reverse()
      .find((message) => message.role === 'user')
      ?.parts.filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('')
      .trim();
    if (!question) throw new Error('请输入分析问题。');
    return this.open(options.abortSignal, async () => {
      const conversationId = this.conversationId || (await this.api.conversationCreate(this.datasetId)).id;
      options.abortSignal?.throwIfAborted();
      const taskId = await this.api.analysisStart(this.datasetId, question, mode, undefined, conversationId);
      this.conversationId = conversationId;
      this.started({ taskId, conversationId });
      return taskId;
    });
  };

  reconnectToStream: ChatTransport<AnalysisMessage>['reconnectToStream'] = async ({ abortSignal }) => {
    const task = this.state?.tasks.find(
      (item) => item.conversationId === this.conversationId && running(item),
    );
    return task ? this.open(abortSignal, async () => task.id, false) : null;
  };

  private open(signal: AbortSignal | undefined, begin: () => Promise<string>, cancelOnAbort = true) {
    this.close();
    let taskId: string | undefined;
    let cancelled = false;
    let detached = false;
    let finish: (() => void) | undefined;
    let receive: ((state: State) => void) | undefined;

    const cleanup = () => {
      detached = true;
      if (this.receive === receive) this.receive = undefined;
      signal?.removeEventListener('abort', abort);
      if (this.detach === detach) this.detach = undefined;
    };

    const detach = () => {
      if (detached) return;
      cleanup();
      finish?.();
    };

    const abort = () => {
      cancelled = true;
      if (taskId && cancelOnAbort) void this.cancel(taskId).catch(() => {});
      detach();
    };
    this.detach = detach;
    signal?.addEventListener('abort', abort, { once: true });
    return createUIMessageStream<AnalysisMessage>({
      execute: async ({ writer }) => {
        if (signal?.aborted) {
          abort();
          return;
        }
        // Let IPC acceptance settle even if navigation has detached the view.
        taskId = await begin();
        if (cancelled && cancelOnAbort) void this.cancel(taskId).catch(() => {});
        if (detached) return;
        writer.write({ type: 'start', messageId: taskId });
        writer.merge(
          new ReadableStream<Chunk>({
            start: (controller) => {
              finish = () => controller.close();
              receive = (state) => {
                if (detached || !taskId) return;
                const entry = analysisEntry(state, taskId);
                if (!entry) return;
                controller.enqueue({ type: 'data-analysis', id: taskId, data: entry });
                if (entry.kind === 'run' || !running(entry.task)) {
                  controller.enqueue({ type: 'finish' });
                  detach();
                }
              };
              this.receive = receive;
              if (this.state) receive(this.state);
            },
            cancel: cleanup,
          }),
        );
      },
      onError: (error) => {
        detach();
        return errorMessage(error);
      },
    });
  }

  close = () => this.detach?.();

  update(state: State) {
    this.state = state;
    this.receive?.(state);
  }

  cancel(taskId: string) {
    if (this.cancellation?.taskId === taskId) return this.cancellation.promise;
    const promise = this.api.analysisCancel(taskId).catch((error) => {
      if (this.cancellation?.taskId === taskId) this.cancellation = undefined;
      throw error;
    });
    this.cancellation = { taskId, promise };
    return promise;
  }
}
