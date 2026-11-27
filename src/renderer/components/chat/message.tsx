import { useI18n } from '../../i18n';
import { cn } from '../../lib/utils';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { isTextUIPart, isToolUIPart } from 'ai';
import { Message, MessageContent, MessageResponse } from '../ai-elements/message';
import { Button } from '../ui/button';
import type { ChatMessage } from '@shared/api';
import { MessageActions } from './message-actions';
import { ChatToolCall } from './tools';
import { getTextFromUIMessage } from './util';

export function isVisibleAssistantPart(part: ChatMessage['parts'][number]) {
  if (isTextUIPart(part)) return Boolean(part.text.trim());
  return isToolUIPart(part);
}

function StreamContent({
  parts,
  messageId,
  saved,
  isStreaming,
}: {
  parts: ChatMessage['parts'];
  messageId: string;
  saved: boolean;
  isStreaming: boolean;
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      {parts.map((part, index) => {
        if (isTextUIPart(part)) return <MessageResponse key={index}>{part.text}</MessageResponse>;
        if (isToolUIPart(part))
          return (
            <ChatToolCall
              key={part.toolCallId}
              call={part}
              messageId={messageId}
              saved={saved}
              isStreaming={isStreaming}
            />
          );
        return null;
      })}
    </div>
  );
}

function UserMessageContent({ text }: { text: string }) {
  const i18n = useI18n();
  const contentId = useId();
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const measure = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(content).lineHeight);
      setOverflowing(content.scrollHeight > lineHeight * 6 + 1);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, [text]);

  return (
    <>
      <div id={contentId} className={expanded ? undefined : 'max-h-[6lh] overflow-hidden'}>
        <div ref={contentRef} onFocusCapture={() => setExpanded(true)}>
          <MessageResponse>{text}</MessageResponse>
        </div>
      </div>
      {overflowing && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto self-start rounded-sm p-0 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? i18n('common.actions.collapse') : i18n('common.actions.showMore')}
        </Button>
      )}
    </>
  );
}

export function PreviewMessage({
  message,
  savedMessageIds = [],
  isStreaming = false,
}: {
  message: ChatMessage;
  savedMessageIds?: string[];
  isStreaming?: boolean;
}) {
  const isUser = message.role === 'user';
  const parts = isUser ? message.parts : message.parts.filter(isVisibleAssistantPart);
  if (!isUser && !parts.length) return null;

  return (
    <Message
      from={message.role}
      className={cn('group/message max-w-full', isUser && 'motion-safe:animate-fade-up')}
    >
      <div className={isUser ? 'flex flex-col items-end gap-2' : 'flex min-w-0'}>
        <MessageContent
          className={cn(
            'leading-[1.6] text-foreground',
            isUser
              ? 'w-fit max-w-[min(88%,56ch)] overflow-hidden wrap-anywhere rounded-2xl rounded-br-sm bg-workspace-control px-4 py-2.5'
              : 'min-w-0 flex-1',
          )}
        >
          {isUser ? (
            <UserMessageContent text={getTextFromUIMessage(message)} />
          ) : (
            <StreamContent
              parts={parts}
              messageId={message.id}
              saved={savedMessageIds.includes(message.id)}
              isStreaming={isStreaming}
            />
          )}
        </MessageContent>
      </div>
      <MessageActions message={message} isStreaming={isStreaming} />
    </Message>
  );
}
