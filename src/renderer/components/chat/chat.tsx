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
import { ChatWelcomeHeader } from './welcome';
import { Messages } from './messages';
import { MultimodalInput } from './multimodal-input';

type Props = {
  dataset: Pick<DatasetSummary, 'id' | 'name' | 'sourceType'>;
  datasets: DatasetSummary[];
  onDatasetChange: (datasetId: string) => void;
  onOpenDatasetPreview: () => void;
  previewOpen: boolean;
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
  onOpenDatasetPreview,
  previewOpen,
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

  const datasetSelector = !conversationId && (
    <Select value={datasetId} onValueChange={changeDataset} disabled={busy}>
      <SelectTrigger
        aria-label="切换数据源"
        title={datasetName}
        className={cn(
          'h-7 rounded-full border-transparent px-2.5',
          starting
            ? 'bg-workspace-control/70 text-muted-foreground hover:bg-workspace-control hover:text-ink'
            : 'bg-surface shadow-card hover:bg-[light-dark(#f5f9ff,#263448)]',
        )}
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
  );

  return (
    <TooltipProvider>
      <section
        className={cn(
          'relative isolate flex h-full min-h-0 flex-col text-base text-foreground [&_code]:font-chat-mono [&_pre]:font-chat-mono',
          starting && [
            'bg-[light-dark(#fff,#1b232e)]',
            'bg-[image:radial-gradient(ellipse_60%_26%_at_50%_0%,light-dark(#e9f6ff,#24384c),transparent_70%),radial-gradient(ellipse_70%_22%_at_55%_106%,light-dark(#5cbfff52,#2489ce55),transparent),radial-gradient(ellipse_90%_28%_at_40%_112%,light-dark(#afe4ff80,#28619763),transparent)]',
            'before:pointer-events-none before:absolute before:inset-0 before:-z-20 before:[--grid-line:light-dark(#2f96e90e,#83caff13)]',
            'before:bg-[image:linear-gradient(var(--grid-line)_1px,transparent_1px),linear-gradient(90deg,var(--grid-line)_1px,transparent_1px)] before:bg-size-[26px_26px] before:mask-[radial-gradient(ellipse_75%_42%_at_50%_0%,#000_10%,transparent_75%)]',
          ],
        )}
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
              'w-full',
              starting
                ? 'max-w-[760px] px-[clamp(14px,5%,40px)] pt-[calc(var(--workspace-titlebar-height)+clamp(24px,5.5vh,72px))] pb-10'
                : 'mx-auto max-w-3xl px-4 pt-2 pb-4',
              starting && !previewOpen && 'mx-auto',
            )}
          >
            {starting && (
              <ChatWelcomeHeader
                datasetName={datasetName}
                datasetSourceType={dataset.sourceType}
                onOpenDatasetPreview={onOpenDatasetPreview}
                previewOpen={previewOpen}
                showModelNotice={!activeModelId}
                error={displayError}
              />
            )}
            <div
              data-draft-slide={starting ? '' : undefined}
              className={cn(
                starting &&
                  'mt-[clamp(8px,calc(5vh-1.6rem),56px)] motion-safe:animate-fade-up motion-safe:[animation-delay:50ms] motion-safe:[animation-fill-mode:backwards]',
              )}
            >
              {!starting && datasetSelector && <div className="mb-2">{datasetSelector}</div>}
              <MultimodalInput
                welcome={starting}
                datasetSelector={starting ? datasetSelector : null}
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
            {starting && hasSuggestions && (
              <ul
                data-draft-slide
                aria-label="示例问题"
                className="m-0 mt-3 list-none p-0 motion-safe:animate-fade-up motion-safe:[animation-delay:100ms] motion-safe:[animation-fill-mode:backwards]"
              >
                {suggestions.map(({ query }) => (
                  <li key={query}>
                    <Suggestion
                      suggestion={query}
                      onClick={(value) => {
                        setQuestion(value);
                        inputRef.current?.focus();
                      }}
                      className="group/example h-auto min-h-9 w-full items-center justify-between gap-3 rounded-lg bg-transparent px-3 py-1.5 text-left text-sm leading-relaxed font-normal whitespace-normal text-muted-foreground hover:bg-workspace-control hover:text-ink focus-visible:bg-workspace-control focus-visible:text-ink motion-reduce:transition-none"
                    >
                      <span className="flex min-w-0 items-start gap-2">
                        <span className="shrink-0" aria-hidden>💡</span>
                        <span className="min-w-0 wrap-anywhere">{query}</span>
                      </span>
                      <ArrowUpRightIcon
                        className="size-3.5 shrink-0 text-accent/70 group-hover/example:text-accent group-focus-visible/example:text-accent"
                        aria-hidden
                      />
                    </Suggestion>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </TooltipProvider>
  );
}
