import { useChat } from '@ai-sdk/react';
import { generateId } from 'ai';
import { ArrowLeftIcon } from 'lucide-react';
import { analysisStrategy } from '@shared/api';
import type { ChatMessage } from '@shared/api';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { PromptInputMessage } from '../ai-elements/prompt-input';
import { Button } from '../ui/button';
import { TooltipProvider } from '../ui/tooltip';
import type { ModelProfile, Preferences, SuggestResult } from '../../types';
import { errorMessage } from '../../utils';
import { IpcChatTransport } from './ipc-chat-transport';
import { Messages } from './messages';
import { MultimodalInput } from './multimodal-input';

type Props = {
  datasetId: string;
  conversationId: string | null;
  savedMessageIds: string[];
  onConversationChange: (id: string) => void;
  onBack: () => void;
  models: ModelProfile[];
  activeModelId: string;
  preferences: Preferences;
};

export function Chat({
  datasetId,
  conversationId,
  savedMessageIds,
  onConversationChange,
  onBack,
  models,
  activeModelId,
  preferences,
}: Props) {
  const [question, setQuestion] = useState('');
  const chatId = useMemo(() => conversationId ?? generateId(), [datasetId, conversationId]);
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
  const [historyLoading, setHistoryLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<SuggestResult[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [error, setError] = useState('');
  const activeProvider = models.find((model) => model.id === activeModelId);
  const activeModel = activeProvider?.model ?? '';

  const busy = status === 'submitted' || status === 'streaming';
  const displayError = error || chatError?.message;

  useEffect(() => {
    setQuestion('');
    setError('');
    setHistoryLoading(Boolean(conversationId));
  }, [chatId]);

  useEffect(() => {
    let live = true;
    if (!conversationId) {
      setHistoryLoading(false);
    } else if (!busy) {
      window.workbench
        .analysisGetMessages(conversationId)
        .then((history) => {
          if (live) setMessages(history);
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
        className="chat-theme flex h-full min-h-0 flex-col bg-background text-base text-foreground [&_code]:font-chat-mono [&_pre]:font-chat-mono [&_[data-streamdown=code-block-body]_code>span]:before:text-sm"
        aria-label="AI 对话"
      >
        <header className="flex h-14 shrink-0 items-center gap-2 px-4">
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full"
            onClick={onBack}
            aria-label="返回数据源"
          >
            <ArrowLeftIcon />
          </Button>
          <span className="text-sm font-medium">AI 对话</span>
        </header>
        <Messages
          key={chatId}
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
