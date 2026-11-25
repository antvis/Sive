import { useChat } from '@ai-sdk/react';
import { analysisStrategy } from '@shared/api';
import type { ChatMessage } from '@shared/api';
import { ArrowUpRightIcon } from 'lucide-react';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { DataSourceLogo } from '../DataSourceLogo';
import type { PromptInputMessage } from '../ai-elements/prompt-input';
import { Suggestion } from '../ai-elements/suggestion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { TooltipProvider } from '../ui/tooltip';
import { cn } from '../../lib/utils';
import { ThemeContext } from '../../theme';
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
        {starting && <DraftBackground />}
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
                ? '@container grid min-h-full max-w-[680px] grid-cols-[minmax(0,1fr)] grid-rows-[minmax(max-content,1fr)_auto_minmax(max-content,1fr)] px-5 pt-[calc(var(--workspace-titlebar-height)+16px)] pb-[clamp(26px,5.5vh,46px)]'
                : 'max-w-3xl pt-2 pb-4',
            )}
          >
            {starting && (
              <header className="isolate flex min-w-0 flex-col-reverse gap-3 self-end pb-[clamp(18px,4vh,2.5rem)] @min-[380px]:grid @min-[380px]:grid-cols-[minmax(0,1fr)_auto] @min-[380px]:items-center @min-[380px]:gap-6 motion-safe:animate-fade-up">
                <div className="min-w-0">
                  <h1 className="text-3xl leading-tight font-semibold tracking-tight wrap-anywhere @min-[540px]:text-4xl">
                    向{' '}
                    <button
                      type="button"
                      title={`预览数据源 ${datasetName}`}
                      className="inline-block max-w-full rounded-sm text-left align-baseline wrap-anywhere text-accent underline-offset-4 hover:underline focus-visible:underline"
                      onClick={onOpenDatasetPreview}
                    >
                      {datasetName}
                    </button>{' '}
                    提问
                  </h1>
                  <p className="mt-2 leading-[1.7] text-[light-dark(#435c78,#b8c8dc)]">
                    用自然语言探索数据中的趋势、差异和异常。
                  </p>
                  {!activeModelId && (
                    <p className="mt-3 text-sm text-muted-foreground">请先在设置中配置默认模型服务。</p>
                  )}
                  {displayError && (
                    <p role="alert" className="mt-3 text-sm wrap-anywhere text-destructive">
                      {displayError}
                    </p>
                  )}
                </div>
                <div className="min-w-0 self-end @min-[380px]:self-center">
                  <DraftCompanion />
                </div>
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
              <div className="min-w-0 pt-3">
                {hasSuggestions && (
                  <ul
                    aria-label="示例问题"
                    className="m-0 grid list-none gap-0.5 p-0 motion-safe:animate-fade-up motion-safe:[animation-delay:100ms] motion-safe:[animation-fill-mode:backwards]"
                  >
                    {suggestions.map(({ query }) => (
                      <li key={query} className="min-w-0">
                        <Suggestion
                          suggestion={query}
                          onClick={(value) => {
                            setQuestion(value);
                            inputRef.current?.focus();
                          }}
                          className="group/example h-auto min-h-9 w-full items-center justify-between gap-3 rounded-lg bg-transparent px-3 py-1.5 text-left text-sm leading-relaxed whitespace-normal text-muted-foreground hover:bg-workspace-control hover:text-ink focus-visible:bg-workspace-control focus-visible:text-ink motion-reduce:transition-none"
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
            )}
          </div>
        </div>
      </section>
    </TooltipProvider>
  );
}

const GLOW_RADIUS = 182;
const GLOW_IDLE_DELAY = 120;
const GLOW_FADE_DURATION = 320;
const RIPPLE_DURATION = 560;

type Point = { x: number; y: number };
type Glow = Point & { fadeAt: number };
type Ripple = Point & { startedAt: number };

function DraftBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { mode } = useContext(ThemeContext);

  useEffect(() => {
    const canvas = canvasRef.current;
    const draft = canvas?.parentElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !draft || !context) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const dark = mode === 'dark';
    let frame = 0;
    let width = 0;
    let height = 0;
    let glow: Glow | undefined;
    let ripples: Ripple[] = [];

    const draw = (now: number) => {
      frame = 0;
      context.clearRect(0, 0, width, height);

      if (glow) {
        const { x, y, fadeAt } = glow;
        const opacity = 1 - Math.max(0, now - fadeAt) / GLOW_FADE_DURATION;
        if (opacity > 0) {
          const gradient = context.createRadialGradient(x, y, 0, x, y, GLOW_RADIUS);
          gradient.addColorStop(0, dark ? '#7ac8ff32' : '#1ca9f52b');
          gradient.addColorStop(0.42, dark ? '#55adff15' : '#52c4ff15');
          gradient.addColorStop(1, '#52c4ff00');
          context.globalAlpha = opacity ** 2;
          context.fillStyle = gradient;
          context.fillRect(x - GLOW_RADIUS, y - GLOW_RADIUS, GLOW_RADIUS * 2, GLOW_RADIUS * 2);
        } else {
          glow = undefined;
        }
      }

      ripples = ripples.filter(({ startedAt }) => now - startedAt < RIPPLE_DURATION);
      for (const { x, y, startedAt } of ripples) {
        const progress = Math.max(0, now - startedAt) / RIPPLE_DURATION;
        const radius = 12 + 105 * (1 - (1 - progress) ** 2);

        context.globalAlpha = 0.48 * (1 - progress) ** 1.6;
        context.strokeStyle = dark ? '#b6e3ff' : '#1697e3';
        context.lineWidth = 1.6 - progress * 0.8;
        context.beginPath();
        context.arc(x, y, radius, 0, 2 * Math.PI);
        context.stroke();
      }

      context.globalAlpha = 1;
      if (glow || ripples.length) requestDraw();
    };

    function requestDraw() {
      if (!frame) frame = requestAnimationFrame(draw);
    }

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const scale = Math.min(window.devicePixelRatio, 2);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
      requestDraw();
    };

    const locate = (event: MouseEvent): Point => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    function move(event: PointerEvent) {
      if (reduceMotion.matches || event.pointerType === 'touch') return;
      glow = { ...locate(event), fadeAt: performance.now() + GLOW_IDLE_DELAY };
      requestDraw();
    }

    function click(event: MouseEvent) {
      if (reduceMotion.matches || event.detail === 0) return;
      if (ripples.length === 4) ripples.shift();
      ripples.push({ ...locate(event), startedAt: performance.now() });
      requestDraw();
    }

    function leave() {
      if (glow) glow.fadeAt = Math.min(glow.fadeAt, performance.now());
    }

    function reset() {
      glow = undefined;
      ripples = [];
      requestDraw();
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    draft.addEventListener('pointermove', move, { passive: true });
    draft.addEventListener('click', click, { capture: true, passive: true });
    draft.addEventListener('pointerleave', leave, { passive: true });
    reduceMotion.addEventListener('change', reset);
    window.addEventListener('blur', reset);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      draft.removeEventListener('pointermove', move);
      draft.removeEventListener('click', click, true);
      draft.removeEventListener('pointerleave', leave);
      reduceMotion.removeEventListener('change', reset);
      window.removeEventListener('blur', reset);
    };
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      data-draft-background
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 block size-full"
    />
  );
}

const leftBubble = 'top-0 left-0 after:right-10';
const rightBubble = 'top-11 right-0 after:left-5';

const prompts = [
  {
    text: '最近有什么变化？',
    className: cn(leftBubble, 'motion-reduce:opacity-100'),
  },
  {
    text: '哪组差异最大？',
    className: cn(rightBubble, 'motion-safe:[animation-delay:1.2s] motion-reduce:opacity-100'),
  },
  {
    text: '有没有异常值？',
    className: cn(leftBubble, 'motion-safe:[animation-delay:6s]'),
  },
  {
    text: '画张图看看？',
    className: cn(rightBubble, 'motion-safe:[animation-delay:7.2s]'),
  },
];

function DraftCompanion() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative flex w-56 max-w-full justify-center self-end pt-19 select-none"
    >
      <div className="motion-safe:animate-draft-companion-enter">
        <img
          src="./illustrations/draft-companion.png"
          alt=""
          width={288}
          height={259}
          decoding="async"
          className="h-[clamp(64px,11vh,96px)] w-auto origin-[50%_78%] object-contain drop-shadow-[0_9px_12px_#07589532] motion-safe:animate-draft-companion-idle"
        />
      </div>
      {prompts.map(({ text, className }) => (
        <p
          key={text}
          className={cn(
            'absolute z-10 rounded-xl bg-[light-dark(#f7faffed,#35485f)] px-3 py-1.5 text-sm font-medium whitespace-nowrap text-[light-dark(#16436c,#e8f5ff)] opacity-0 shadow-[0_3px_12px_#213d621a] after:absolute after:top-full after:h-1 after:w-2 after:bg-inherit after:[clip-path:polygon(0_0,100%_0,50%_100%)] motion-safe:animate-draft-companion-bubble',
            className,
          )}
        >
          {text}
        </p>
      ))}
    </div>
  );
}
