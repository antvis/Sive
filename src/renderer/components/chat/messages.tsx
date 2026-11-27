import type { ChatMessage } from '@shared/api';
import { LoaderCircleIcon } from 'lucide-react';
import { useMemo } from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '../ai-elements/conversation';
import { isVisibleAssistantPart, PreviewMessage } from './message';
import { getMessagesForDisplay } from './util';

type Props = {
  messages: ChatMessage[];
  savedMessageIds: string[];
  historyLoading: boolean;
  isStreaming: boolean;
  error?: string;
};

export function Messages({
  messages,
  savedMessageIds,
  historyLoading,
  isStreaming,
  error,
}: Props) {
  const latestMessage = messages.at(-1);
  const displayMessages = useMemo(() => getMessagesForDisplay(messages), [messages]);

  return (
    <Conversation className="min-h-0 touch-pan-y">
      <ConversationContent className="mx-auto min-h-full w-full min-w-0 max-w-(--chat-content-width) gap-6 px-4 pt-6 pb-8">
        {historyLoading ? (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
            正在加载会话…
          </p>
        ) : (
          displayMessages.map((message) => (
            <PreviewMessage
              key={message.id}
              message={message}
              savedMessageIds={savedMessageIds}
              isStreaming={isStreaming && message.id === latestMessage?.id}
            />
          ))
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
