import { useChat } from '@ai-sdk/react';
import { analysisStrategy } from '@shared/api';
import type { ChatMessage } from '@shared/api';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DataSourceLogo } from '../DataSourceLogo';
import type { PromptInputMessage } from '../ai-elements/prompt-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { TooltipProvider } from '../ui/tooltip';
import type { DatasetSummary, ModelProfile, Preferences, SuggestResult } from '../../types';
import { errorMessage } from '../../utils';
import { IpcChatTransport } from './ipc-chat-transport';
import { useConversationRead } from '../../hooks/useConversationStatus';
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
}: Props) {
  const { id: datasetId, name: datasetName } = dataset;
  const [question, setQuestion] = useState('');
  const transport = useMemo(
    () => new IpcChatTransport(onConversationChange, (cause) => toast.error(errorMessage(cause))),
    [onConversationChange],
  );
  const {
    messages,
    setMessages,
    sendMessage,
    status,
    error: chatError,
  } = useChat<ChatMessage>({ id: chatId, transport });
  const [historyLoading, setHistoryLoading] = useState(Boolean(conversationId));
  const [loadedChatId, setLoadedChatId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestResult[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [error, setError] = useState('');
  const activeProvider = models.find((model) => model.id === activeModelId);
  const activeModel = activeProvider?.model ?? '';

  const busy = status === 'submitted' || status === 'streaming';
  const displayError = error || chatError?.message;

  useConversationRead(chatId, visible && loadedChatId === chatId && !historyLoading && !busy);

  useEffect(() => {
    let live = true;
    if (!conversationId) {
      setLoadedChatId(chatId);
      setHistoryLoading(false);
    } else if (!busy) {
      setLoadedChatId(null);
      window.workbench
        .analysisGetMessages(conversationId)
        .then((history) => {
          if (live) {
            setMessages(history);
            setLoadedChatId(chatId);
          }
        })
        .catch((cause) => {
          if (live) setError(errorMessage(cause));
        })
        .finally(() => {
          if (live) setHistoryLoading(false);
        });
    }
    return () => {
      live = false;
    };
  }, [chatId, conversationId, busy, setMessages]);

  useEffect(() => {
    let live = true;
    if (!activeModelId) {
      setSuggestionsLoading(false);
      setSuggestions([]);
      return;
    }
    setSuggestionsLoading(true);
    setError('');
    window.workbench
      .datasetSuggest(datasetId)
      .then((result) => {
        if (live) setSuggestions(result);
      })
      .catch((cause) => {
        if (live) setError(errorMessage(cause));
      })
      .finally(() => {
        if (live) setSuggestionsLoading(false);
      });
    return () => {
      live = false;
    };
  }, [datasetId, activeModelId, activeModel]);

  const changeDataset = (id: string) => {
    setSuggestions([]);
    setSuggestionsLoading(Boolean(activeModelId));
    setError('');
    onDatasetChange(id);
  };

  const start = async ({ text }: PromptInputMessage) => {
    if (!text.trim() || !activeModelId || busy || historyLoading) return;
    setError('');
    setQuestion('');
    await sendMessage(
      { text: text.trim(), metadata: { createdAt: new Date().toISOString() } },
      {
        body: {
          datasetId,
          strategy: preferences.strategy,
        },
      },
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
          key={chatId}
          datasetName={datasetName}
          onOpenDatasetPreview={onOpenDatasetPreview}
          messages={messages}
          savedMessageIds={savedMessageIds}
          historyLoading={historyLoading}
          isStreaming={busy}
          suggestions={suggestions}
          suggestionsLoading={suggestionsLoading}
          hasModel={Boolean(activeModelId)}
          error={displayError}
          onSuggestion={setQuestion}
        />
        <div className="mx-auto w-full max-w-3xl shrink-0 px-5 pt-3 pb-4">
          {!conversationId && (
            <Select value={datasetId} onValueChange={changeDataset} disabled={busy}>
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
