import { ArrowDown, ArrowLeft, Sparkle } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Tabs } from 'radix-ui';
import { toast } from 'sonner';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { Select } from '../../components/Select';
import type { AnalysisMessage, AnalysisTaskEvent, ModelProfile, Preferences } from '../../types';
import { errorMessage } from '../../utils';
import { AnalysisMessageView } from './AnalysisMessage';
import { DatasetQuestions } from './DatasetQuestions';

type Props = {
  datasetId: string;
  datasetUpdatedAt?: string;
  conversationId: string | null;
  savedMessageIds: string[];
  onConversationChange: (id: string) => void;
  onBack: () => void;
  models: ModelProfile[];
  activeModelId: string;
  preferences: Preferences;
};

const modelValue = (providerId: string, model: string) => JSON.stringify([providerId, model]);
type StreamPart = NonNullable<AnalysisTaskEvent['part']>;

export function ConversationPanel({
  datasetId,
  datasetUpdatedAt,
  conversationId,
  savedMessageIds,
  onConversationChange,
  onBack,
  models,
  activeModelId,
  preferences,
}: Props) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<AnalysisMessage[]>([]);
  const [activeTask, setActiveTask] = useState<AnalysisTaskEvent | null>(null);
  const [stream, setStream] = useState<{ taskId: string; parts: StreamPart[] } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [sending, setSending] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState('');
  const activeProvider = models.find((model) => model.id === activeModelId);
  const activeModel = activeProvider?.model ?? '';
  const options = models.flatMap((provider) =>
    provider.modelIds.map((model) => ({
      value: modelValue(provider.id, model),
      label: `${provider.name} · ${model}`,
    })),
  );

  const currentTask = activeTask?.conversationId === conversationId ? activeTask : null;
  const streamPartCount = stream?.parts.length ?? 0;

  const scrollToBottom = useCallback(() => {
    const container = scrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
    setShowScrollToBottom(false);
  }, []);

  const handleScroll = () => {
    const container = scrollRef.current;
    if (container) {
      setShowScrollToBottom(container.scrollHeight - container.scrollTop - container.clientHeight > 24);
    }
  };

  useEffect(() => {
    if (!showScrollToBottom) scrollToBottom();
  }, [messages, streamPartCount, showScrollToBottom, scrollToBottom]);

  const loadMessages = useCallback(
    async (id: string | null = conversationId) => {
      if (!id) {
        setMessages([]);
        setHistoryLoading(false);
        return;
      }
      setMessages(await window.workbench.analysisGetMessages(id));
      setHistoryLoading(false);
    },
    [conversationId],
  );

  useEffect(() => {
    setActiveTask(null);
    setStream(null);
    setQuestion('');
    setError('');
  }, [datasetId]);

  useEffect(() => {
    setHistoryLoading(true);
    setMessages([]);
    setShowScrollToBottom(false);
    loadMessages().catch((cause) => {
      setError(errorMessage(cause));
      setHistoryLoading(false);
    });
  }, [loadMessages]);

  useEffect(() => {
    return window.workbench.analysisOnTaskChange((event) => {
      if (event.datasetId !== datasetId) return;
      if (event.part) {
        const part = event.part;
        setStream((current) => ({
          taskId: event.taskId,
          parts: current?.taskId === event.taskId ? [...current.parts, part] : [part],
        }));
      }
      setActiveTask((current) => {
        if (event.status === 'running') return event;
        return current?.taskId === event.taskId ? null : current;
      });
      if (event.status !== 'running') {
        if (event.conversationId === conversationId) {
          if (event.error) toast.error(event.error);
          void loadMessages()
            .catch((cause) => toast.error(errorMessage(cause)))
            .finally(() => {
              setStream((current) => (current?.taskId === event.taskId ? null : current));
            });
        } else {
          setStream((current) => (current?.taskId === event.taskId ? null : current));
        }
      }
    });
  }, [datasetId, conversationId, loadMessages]);

  const start = async () => {
    if (!question.trim() || !activeModelId || currentTask || sending) return;
    setShowScrollToBottom(false);
    setSending(true);
    setError('');
    try {
      const result = await window.workbench.analysisStart({
        datasetId,
        question: question.trim(),
        strategy: preferences.analysisMode,
        conversationId: conversationId ?? undefined,
      });
      onConversationChange(result.conversationId);
      setActiveTask({
        taskId: result.taskId,
        datasetId,
        conversationId: result.conversationId,
        status: 'running',
        stage: '准备分析',
      });
      setQuestion('');
      await loadMessages(result.conversationId);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSending(false);
    }
  };

  const cancel = async () => {
    if (!currentTask) return;
    try {
      await window.workbench.analysisCancel(currentTask.taskId);
      setActiveTask(null);
      setStream(null);
      await loadMessages();
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  };

  const changeModel = (value: string) => {
    const [id, model] = JSON.parse(value) as [string, string];
    window.workbench.modelActivate(id, model).catch((cause) => toast.error(errorMessage(cause)));
  };

  const changeMode = (analysisMode: string) => {
    window.workbench
      .settingsSavePreferences({ ...preferences, analysisMode: analysisMode as Preferences['analysisMode'] })
      .catch((cause) => toast.error(errorMessage(cause)));
  };

  const onQuestionKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const send =
      preferences.sendShortcut === 'enter'
        ? event.key === 'Enter' && !event.shiftKey
        : event.key === 'Enter' && (event.metaKey || event.ctrlKey);
    if (send && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void start();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center border-b px-4">
        <IconButton icon={ArrowLeft} label="返回数据源" onClick={onBack} />
        <span className="ml-1 text-sm font-medium">AI 对话</span>
      </div>
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          className="h-full overflow-x-hidden overflow-y-auto px-8 py-5"
          onScroll={handleScroll}
        >
          {historyLoading ? (
            <p className="text-sm text-muted">正在加载会话…</p>
          ) : messages.length ? (
            <div className="grid w-full min-w-0 gap-5">
              {messages.map((message) => (
                <AnalysisMessageView
                  key={message.id}
                  message={message}
                  savedMessageIds={savedMessageIds}
                  activeTask={currentTask}
                  streamParts={message.id === stream?.taskId ? stream.parts : []}
                />
              ))}
            </div>
          ) : (
            <div className="w-full min-w-0 pt-8">
              <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
                <Sparkle size={22} />
              </span>
              <h1 className="mt-4 mb-2 text-xl font-semibold">向数据提问，发现新的洞察</h1>
              <p className="m-0 text-sm leading-6 text-muted">选择一个推荐问题，或输入你关心的问题。</p>
              <div className="mt-6 grid gap-2">
                {activeProvider ? (
                  <DatasetQuestions
                    key={JSON.stringify([
                      datasetId,
                      datasetUpdatedAt,
                      activeModelId,
                      activeModel,
                      activeProvider.updatedAt,
                    ])}
                    datasetId={datasetId}
                    onSelect={setQuestion}
                  />
                ) : (
                  <p className="text-sm text-muted">请先在设置中配置默认模型服务。</p>
                )}
                {error && <p className="m-0 text-sm text-danger">{error}</p>}
              </div>
            </div>
          )}
          {error && messages.length > 0 && <p className="mt-4 text-sm text-danger">{error}</p>}
        </div>
        {showScrollToBottom && (
          <Button
            variant="ghost"
            className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-surface/90 px-3 text-xs shadow-md backdrop-blur-sm hover:bg-surface"
            onClick={scrollToBottom}
          >
            <ArrowDown size={14} />
            回到底部
          </Button>
        )}
      </div>
      <div className="shrink-0 border-t p-4">
        <textarea
          className="min-h-24 w-full resize-none rounded-xl bg-page p-3 text-sm leading-6 outline-none focus:bg-accent-soft"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={onQuestionKeyDown}
          placeholder="输入你的分析问题…"
          aria-label="分析问题"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select
            aria-label="选择模型"
            value={activeProvider ? modelValue(activeProvider.id, activeModel) : ''}
            onChange={changeModel}
            options={options}
            disabled={!models.length || !!currentTask}
            className="w-36 shrink-0"
            compact
          />
          <Tabs.Root className="shrink-0" value={preferences.analysisMode} onValueChange={changeMode}>
            <Tabs.List aria-label="分析方式" className="flex rounded-lg bg-page p-1">
              <Tabs.Trigger
                value="direct"
                disabled={!!currentTask}
                className="rounded-md px-2 py-1 text-xs text-muted data-[state=active]:bg-surface data-[state=active]:text-ink"
              >
                直接分析
              </Tabs.Trigger>
              <Tabs.Trigger
                value="loop"
                disabled={!!currentTask}
                className="rounded-md px-2 py-1 text-xs text-muted data-[state=active]:bg-surface data-[state=active]:text-ink"
              >
                多步探索
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
          {currentTask ? (
            <Button className="ml-auto shrink-0" variant="secondary" onClick={() => void cancel()}>
              停止
            </Button>
          ) : (
            <Button
              className="ml-auto shrink-0"
              variant="primary"
              disabled={!question.trim() || !activeModelId || sending}
              onClick={() => void start()}
            >
              {sending ? '提交中…' : '发送'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
