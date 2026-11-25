import { useChat } from '@ai-sdk/react';
import { analysisStrategy } from '@shared/api';
import type { ChatMessage } from '@shared/api';
import { ArrowUpRightIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { DataSourceLogo } from '../DataSourceLogo';
import type { PromptInputMessage } from '../ai-elements/prompt-input';
import { Suggestion } from '../ai-elements/suggestion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { TooltipProvider } from '../ui/tooltip';
import { cn } from '../../lib/utils';
import type { DatasetSummary, ModelProfile, Preferences, SuggestResult } from '../../types';
import { errorMessage } from '../../utils';
import { IpcChatTransport } from './ipc-chat-transport';
import { useConversationRead } from '../../hooks/useConversationStatus';
import { Messages } from './messages';
import { MultimodalInput } from './multimodal-input';
import { DraftBackground } from './DraftBackground';

type Props = {
  dataset: Pick<DatasetSummary, 'id' | 'name' | 'sourceType'>;
  datasets: DatasetSummary[];
  onDatasetChange: (datasetId: string) => void;
  toolbar: ReactNode;
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
  toolbar,
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
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
  const starting = !historyLoading && !busy && messages.length === 0;
  const hasSuggestions = !suggestionsLoading && suggestions.length > 0;
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
        data-conversation-draft={starting ? '' : undefined}
        className="relative isolate flex h-full min-h-0 flex-col text-base text-foreground data-conversation-draft:bg-[light-dark(#fafcfe,#1b232e)] [&_code]:font-chat-mono [&_pre]:font-chat-mono"
        aria-label="AI 对话"
      >
        {toolbar && (
          <div
            className={cn(
              'top-(--workspace-titlebar-row-offset) z-10 mx-px flex h-(--workspace-titlebar-height) items-center gap-1 pe-2',
              starting ? 'absolute inset-x-0' : 'relative shrink-0',
            )}
          >
            {toolbar}
          </div>
        )}
        {!starting && (
          <Messages
            key={chatId}
            messages={messages}
            savedMessageIds={savedMessageIds}
            historyLoading={historyLoading}
            isStreaming={busy}
            error={displayError}
          />
        )}
        <div className={starting ? 'min-h-0 flex-1 overflow-y-auto' : 'shrink-0'}>
          <div
            className={cn(
              'mx-auto w-full px-4',
              starting
                ? '@container grid min-h-full max-w-[680px] grid-cols-[minmax(0,1fr)] grid-rows-[minmax(max-content,1fr)_auto_minmax(max-content,1fr)] px-5 pt-[calc(var(--workspace-titlebar-height)+16px)] pb-6'
                : 'max-w-3xl pt-2 pb-4',
            )}
          >
            {starting && (
              <header className="isolate self-end pb-[clamp(18px,4vh,2.5rem)] text-center motion-safe:animate-fade-up">
                <div className="relative mx-auto mb-2 flex w-fit max-w-full flex-col items-center">
                  <DraftBackground />
                  <p className="relative z-10 me-[clamp(12px,8cqw,52px)] mb-0.5 rounded-xl bg-[light-dark(#f7faffd9,#b4d1f229)] px-3 py-2 text-sm font-medium text-[light-dark(#16436c,#e8f5ff)] shadow-[0_3px_12px_#213d6212] backdrop-blur-md after:absolute after:top-full after:left-6 after:h-1.5 after:w-2.5 after:bg-inherit after:[clip-path:polygon(0_0,100%_0,50%_100%)]">
                    想从数据里发现什么？
                  </p>
                  <div className="motion-safe:animate-draft-companion-enter">
                    <img
                      src="./illustrations/draft-companion.png"
                      alt=""
                      width={288}
                      height={259}
                      decoding="async"
                      className="h-[clamp(64px,11vh,96px)] w-auto object-contain drop-shadow-[0_9px_12px_#07589532]"
                    />
                  </div>
                </div>
                <h1 className="text-3xl leading-tight font-semibold tracking-tight">开始数据分析</h1>
                <p className="mt-2 leading-[1.7] text-[light-dark(#435c78,#b8c8dc)]">
                  探索数据中的趋势、差异和异常。
                </p>
                {!activeModelId && (
                  <p className="mt-3 text-sm text-muted-foreground">请先在设置中配置默认模型服务。</p>
                )}
                {displayError && (
                  <p role="alert" className="mt-3 text-sm wrap-anywhere text-destructive">
                    {displayError}
                  </p>
                )}
              </header>
            )}
            <div
              className={
                starting
                  ? 'motion-safe:animate-fade-up motion-safe:[animation-delay:50ms] motion-safe:[animation-fill-mode:backwards]'
                  : undefined
              }
            >
              {!conversationId && (
                <div className="mb-2">
                  <Select value={datasetId} onValueChange={changeDataset} disabled={busy}>
                    <SelectTrigger
                      aria-label="切换数据源"
                      title={datasetName}
                      className="h-7 rounded-full border-transparent bg-surface px-2.5 shadow-card hover:bg-[light-dark(#f5f9ff,#263448)]"
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
                </div>
              )}
              <MultimodalInput
                inputRef={inputRef}
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
            {starting && (
              <div className="min-w-0 pt-5">
                {hasSuggestions && (
                  <section
                    aria-labelledby="draft-suggestions-heading"
                    className="motion-safe:animate-fade-up motion-safe:[animation-delay:100ms] motion-safe:[animation-fill-mode:backwards]"
                  >
                    <h2
                      id="draft-suggestions-heading"
                      className="mb-2 px-1 text-sm font-medium text-muted-foreground"
                    >
                      可以这样问
                    </h2>
                    <div className="grid grid-cols-1 gap-2 @min-[540px]:grid-cols-3">
                      {suggestions.map(({ query }) => (
                        <Suggestion
                          key={query}
                          suggestion={query}
                          onClick={(value) => {
                            setQuestion(value);
                            inputRef.current?.focus();
                          }}
                          className="h-auto min-h-11 w-full items-start justify-between gap-2 rounded-xl bg-surface px-3 py-2.5 text-left text-sm leading-relaxed whitespace-normal text-foreground shadow-card hover:bg-surface hover:shadow-card-raised motion-safe:transition-[box-shadow,scale,translate] motion-safe:duration-150 motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none"
                        >
                          <span className="min-w-0 wrap-anywhere">{query}</span>
                          <ArrowUpRightIcon className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
                        </Suggestion>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </TooltipProvider>
  );
}
