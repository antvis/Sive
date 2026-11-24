import { generateId } from 'ai';
import { ArrowLeftIcon } from 'lucide-react';
import { analysisStrategy } from '@shared/api';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { PromptInputMessage } from '../ai-elements/prompt-input';
import { Button } from '../ui/button';
import { TooltipProvider } from '../ui/tooltip';
import type { ModelProfile, Preferences, SuggestResult } from '../../types';
import { errorMessage } from '../../utils';
import { useAnalysis } from '../../hooks/useAnalysis';
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
  const {
    session,
    loading: historyLoading,
    error: chatError,
  } = useAnalysis(chatId, Boolean(conversationId));
  const { messages, update } = session;
  const [starting, setStarting] = useState(false);
  const visibleChat = useRef<string | null>(chatId);
  const pendingStart = useRef<{ id: string; promise: Promise<void> } | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestResult[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [error, setError] = useState('');
  const activeProvider = models.find((model) => model.id === activeModelId);
  const activeModel = activeProvider?.model ?? '';

  const busy = starting || update.running;
  const status = starting ? 'submitted' : busy ? 'streaming' : 'ready';
  const displayError = error || chatError || undefined;

  useEffect(() => {
    setQuestion('');
    setError('');
    setStarting(false);
    visibleChat.current = chatId;
    return () => {
      visibleChat.current = null;
    };
  }, [chatId]);

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
    setStarting(true);
    const request = window.workbench.analysisStart({
      chatId,
      datasetId,
      strategy: preferences.strategy,
      message: { id: generateId(), role: 'user', parts: [{ type: 'text', text: text.trim() }] },
    });
    pendingStart.current = { id: chatId, promise: request };
    try {
      await request;
      if (visibleChat.current === chatId) {
        setQuestion('');
        onConversationChange(chatId);
      }
    } catch (cause) {
      if (visibleChat.current === chatId) setError(errorMessage(cause));
    } finally {
      if (pendingStart.current?.promise === request) pendingStart.current = null;
      if (visibleChat.current === chatId) setStarting(false);
    }
  };

  const stop = () => {
    const started = pendingStart.current?.id === chatId ? pendingStart.current.promise : Promise.resolve();
    void started
      .then(() => window.workbench.analysisCancel(chatId))
      .catch((cause) => toast.error(errorMessage(cause)));
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
            onStop={stop}
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
