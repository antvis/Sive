import { Chat as AnalysisChat, useChat } from '@ai-sdk/react';
import { analysisStrategy } from '@shared/api';
import type { ChatMessage } from '@shared/api';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DataSourceLogo } from '../DataSourceLogo';
import type { PromptInputMessage } from '../ai-elements/prompt-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { TooltipProvider } from '../ui/tooltip';
import type { DatasetSummary, ModelProfile, Preferences, SuggestResult } from '../../types';
import { errorMessage } from '../../utils';
import { useConversationRead } from '../../hooks/useConversationStatus';
import { IpcChatTransport } from './ipc-chat-transport';
import { Messages } from './messages';
import { MultimodalInput } from './multimodal-input';

type Props = {
  dataset: Pick<DatasetSummary, 'id' | 'name' | 'sourceType'>;
  datasets: DatasetSummary[];
  onDatasetChange: (datasetId: string) => void;
  onOpenDatasetPreview: () => void;
  chatId: string;
  conversationId: string | null;
  visible: boolean;
  savedMessageIds: string[];
  onConversationChange: (id: string) => void;
  models: ModelProfile[];
  activeModelId: string;
  preferences: Preferences;
  suggestions: { items: SuggestResult[]; loading: boolean; error: string };
};

export function Chat({
  dataset,
  datasets,
  onDatasetChange,
  onOpenDatasetPreview,
  chatId,
  conversationId,
  visible,
  savedMessageIds,
  onConversationChange,
  models,
  activeModelId,
  preferences,
  suggestions,
}: Props) {
  const { id: datasetId, name: datasetName } = dataset;
  const [question, setQuestion] = useState('');
  const [existing] = useState(Boolean(conversationId));
  const [history, setHistory] = useState<'loading' | 'ready' | 'error'>(existing ? 'loading' : 'ready');
  const { chat, transport } = useMemo(() => {
    const transport = new IpcChatTransport(onConversationChange, (messages) => {
      chat.messages = messages;
      setHistory('ready');
    });
    const chat = new AnalysisChat<ChatMessage>({
      id: chatId,
      transport,
      onError: () => setHistory((current) => (current === 'loading' ? 'error' : current)),
    });
    return { chat, transport };
  }, [chatId, onConversationChange]);
  const { messages, sendMessage, status, error } = useChat({ chat });
  const needsHistorySync = useRef(false);

  const historyLoading = history === 'loading';
  const busy = status === 'submitted' || status === 'streaming';
  const displayError = error?.message || (!messages.length && suggestions.error) || undefined;

  useConversationRead(chatId, visible && history === 'ready' && !busy);

  useEffect(() => {
    const unsubscribe = window.workbench.analysisOnStatus((id, update) => {
      // A request started in a detached view may still be preparing OAuth.
      if (
        id === chat.id &&
        update.status === 'running' &&
        (chat.status === 'ready' || chat.status === 'error')
      )
        chat.resumeStream();
    });
    if (existing) chat.resumeStream();
    return () => {
      unsubscribe();
      // SDK cancellation only detaches this view; stopping the task is explicit.
      chat.stop();
      transport.close();
    };
  }, [chat, transport, existing]);

  useEffect(() => {
    if (busy) {
      needsHistorySync.current = true;
      return;
    }
    if (!needsHistorySync.current || !conversationId) return;
    needsHistorySync.current = false;
    let live = true;
    window.workbench.analysisGetSession(conversationId).then(
      (session) => {
        // The SDK has drained the stream; replace partial output with persisted messages.
        if (live && !session.stream) chat.messages = session.messages;
      },
      (cause) => {
        if (live) toast.error(errorMessage(cause));
      },
    );
    return () => {
      live = false;
    };
  }, [busy, chat, conversationId]);

  const start = async ({ text }: PromptInputMessage) => {
    if (!text.trim() || !activeModelId || busy || historyLoading) return;
    setQuestion('');
    await sendMessage(
      { text: text.trim(), metadata: { createdAt: new Date().toISOString() } },
      { body: { datasetId, strategy: preferences.strategy } },
    );
  };

  const changeModel = (value: string) => {
    const [id, model] = JSON.parse(value) as [string, string];
    window.workbench.modelActivate(id, model).catch((cause) => toast.error(errorMessage(cause)));
  };

  const changeMode = (type: string) => {
    window.workbench
      .settingsSavePreferences({
        ...preferences,
        strategy: analysisStrategy(type as 'direct' | 'loop', preferences.strategy),
      })
      .catch((cause) => toast.error(errorMessage(cause)));
  };

  return (
    <TooltipProvider>
      <section
        className="flex h-full min-h-0 flex-col text-base text-foreground [&_code]:font-chat-mono [&_pre]:font-chat-mono"
        aria-label="AI 对话"
      >
        <Messages
          datasetName={datasetName}
          onOpenDatasetPreview={onOpenDatasetPreview}
          messages={messages}
          savedMessageIds={savedMessageIds}
          historyLoading={historyLoading}
          isStreaming={busy}
          suggestions={suggestions.items}
          suggestionsLoading={suggestions.loading}
          hasModel={Boolean(activeModelId)}
          error={displayError}
          onSuggestion={setQuestion}
        />
        <div className="mx-auto w-full max-w-3xl shrink-0 px-5 pt-3 pb-4">
          {!conversationId && (
            <Select value={datasetId} onValueChange={onDatasetChange} disabled={busy}>
              <SelectTrigger
                aria-label="切换数据源"
                title={datasetName}
                className="mb-1.5"
              >
                <SelectValue>
                  <DataSourceLogo type={dataset.sourceType} size={14} />
                  {datasetName}
                </SelectValue>
              </SelectTrigger>
              <SelectContent side="top">
                {datasets.map(({ id, name, sourceType }) => (
                  <SelectItem key={id} value={id}>
                    <DataSourceLogo type={sourceType} size={14} />
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <MultimodalInput
            value={question}
            onChange={setQuestion}
            onSubmit={start}
            onStop={() => transport.stop(chatId)}
            status={status}
            disabled={!activeModelId || historyLoading}
            models={models}
            activeModelId={activeModelId}
            onModelChange={changeModel}
            mode={preferences.strategy.type}
            onModeChange={changeMode}
          />
        </div>
      </section>
    </TooltipProvider>
  );
}
