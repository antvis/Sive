import { Chat } from '@ai-sdk/react';
import type { API, State, AnalysisMode } from '@shared/contracts';
import { analysisMessages, type AnalysisMessage } from './messages';
import { AnalysisChatTransport, type ChatStarted } from './transport';

export class AnalysisChat {
  readonly chat: Chat<AnalysisMessage>;

  readonly transport: AnalysisChatTransport;

  private accepted?: (value: ChatStarted) => void;

  constructor(
    api: Pick<API, 'conversationCreate' | 'analysisStart' | 'analysisCancel'>,
    datasetId: string,
    conversationId: string,
    state: State | null,
  ) {
    this.transport = new AnalysisChatTransport(api, datasetId, conversationId, (started) => {
      this.accepted?.(started);
      this.accepted = undefined;
    });
    this.chat = new Chat({
      id: conversationId || `new:${datasetId}`,
      messages: analysisMessages(state, conversationId),
      transport: this.transport,
      onFinish: () => {
        this.chat.messages = analysisMessages(this.transport.state, this.transport.conversationId);
      },
    });
    if (state) this.transport.update(state);
  }

  update(state: State) {
    this.transport.update(state);
    if (!['submitted', 'streaming'].includes(this.chat.status))
      this.chat.messages = analysisMessages(state, this.transport.conversationId);
  }

  send(text: string, mode: AnalysisMode) {
    if (['submitted', 'streaming'].includes(this.chat.status))
      return Promise.reject(new Error('此会话已有分析正在进行。'));
    // The page needs the persisted conversation before generation finishes.
    return new Promise<ChatStarted>((resolve, reject) => {
      this.accepted = resolve;
      const fail = (error: unknown) => {
        this.accepted = undefined;
        this.chat.messages = analysisMessages(this.transport.state, this.transport.conversationId);
        reject(error);
      };
      void this.chat
        .sendMessage({ text, metadata: { createdAt: new Date().toISOString() } }, { body: { mode } })
        .then(() => {
          if (this.accepted === resolve) fail(this.chat.error || new Error('分析未能启动。'));
        }, fail);
    });
  }
}
