import type { ChatMessage } from '@shared/api';
import { ArrowUpRightIcon, ChartColumnIcon, LoaderCircleIcon } from 'lucide-react';
import { useMemo } from 'react';
import type { SuggestResult } from '../../types';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '../ai-elements/conversation';
import { Suggestion, Suggestions } from '../ai-elements/suggestion';
import { Badge } from '../ui/badge';
import { isVisibleAssistantPart, PreviewMessage } from './message';
import { getMessagesForDisplay } from './util';

type Props = {
  datasetName: string;
  onOpenDatasetPreview: () => void;
  messages: ChatMessage[];
  savedMessageIds: string[];
  historyLoading: boolean;
  isStreaming: boolean;
  suggestions: SuggestResult[];
  suggestionsLoading: boolean;
  hasModel: boolean;
  error?: string;
  onSuggestion: (value: string) => void;
};

export function Messages({
  datasetName,
  onOpenDatasetPreview,
  messages,
  savedMessageIds,
  historyLoading,
  isStreaming,
  suggestions,
  suggestionsLoading,
  hasModel,
  error,
  onSuggestion,
}: Props) {
  const latestMessage = messages.at(-1);
  const displayMessages = useMemo(() => getMessagesForDisplay(messages), [messages]);

  return (
    <Conversation className="min-h-0 touch-pan-y">
      <ConversationContent className="mx-auto min-h-full w-full min-w-0 max-w-3xl gap-6 px-5 pt-6 pb-8">
        {historyLoading ? (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
            正在加载会话…
          </p>
        ) : messages.length ? (
          displayMessages.map((message) => (
            <PreviewMessage
              key={message.id}
              message={message}
              savedMessageIds={savedMessageIds}
              isStreaming={isStreaming && message.id === latestMessage?.id}
            />
          ))
        ) : (
          <>
            <ConversationEmptyState
              className="flex-1 items-start p-0 py-8 text-left"
              title={
                <span className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-1.5">
                  向
                  <Badge
                    asChild
                    variant="outline"
                    className="h-auto max-w-full min-w-0 rounded-lg px-2.5 py-1 text-lg hover:bg-muted active:bg-secondary motion-safe:active:scale-[0.97] motion-reduce:transition-none [&>svg]:size-4!"
                  >
                    <button
                      type="button"
                      title={datasetName}
                      aria-label={`预览数据源 ${datasetName}`}
                      onClick={onOpenDatasetPreview}
                    >
                      <ChartColumnIcon aria-hidden />
                      <span className="min-w-0 truncate">{datasetName}</span>
                    </button>
                  </Badge>
                  提问
                </span>
              }
              description={hasModel ? '选择推荐问题，或输入你关心的问题。' : '请先在设置中配置默认模型服务。'}
            />
            {suggestionsLoading ? (
              <p role="status" className="text-sm text-muted-foreground">
                正在生成推荐问题…
              </p>
            ) : (
              <Suggestions className="w-full flex-col items-stretch gap-2">
                {suggestions.map((suggestion) => (
                  <Suggestion
                    key={suggestion.query}
                    suggestion={suggestion.query}
                    onClick={onSuggestion}
                    className="h-auto min-h-10 justify-between gap-3 border-border bg-background px-4 py-3 text-left text-base leading-normal whitespace-normal shadow-none hover:bg-secondary"
                  >
                    <span>{suggestion.query}</span>
                    <ArrowUpRightIcon
                      className="size-3.5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </Suggestion>
                ))}
              </Suggestions>
            )}
          </>
        )}
        {isStreaming &&
          (latestMessage?.role !== 'assistant' || !latestMessage.parts.some(isVisibleAssistantPart)) && (
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
              正在分析…
            </p>
          )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </ConversationContent>
      <ConversationScrollButton
        aria-label="回到底部"
        className="size-8 rounded-full border-border bg-background shadow-none"
      />
    </Conversation>
  );
}
