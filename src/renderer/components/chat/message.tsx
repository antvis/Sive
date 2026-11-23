import { cn } from '../../lib/utils';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { isTextUIPart, isToolUIPart } from 'ai';
import { Message, MessageContent, MessageResponse } from '../ai-elements/message';
import { Button } from '../ui/button';
import type { ChatMessage } from '@shared/api';
import { MessageActions } from './message-actions';
import { ToolCallView } from './tool-call';

export function isVisibleAssistantPart(part: ChatMessage['parts'][number]) {
  if (isTextUIPart(part)) return Boolean(part.text.trim());
  return isToolUIPart(part);
}

function StreamContent({
  parts,
  messageId,
  savedMessageIds,
  isStreaming,
}: {
  parts: ChatMessage['parts'];
  messageId: string;
  savedMessageIds: string[];
  isStreaming: boolean;
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      {parts.map((part, index) => {
        if (isTextUIPart(part)) return <MessageResponse key={index}>{part.text}</MessageResponse>;
        if (isToolUIPart(part))
          return (
            <ToolCallView
              key={part.toolCallId}
              call={part}
              messageId={messageId}
              savedMessageIds={savedMessageIds}
              isStreaming={isStreaming}
            />
          );
        return null;
      })}
    </div>
  );
}

function UserMessageContent({ text }: { text: string }) {
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
          className="h-auto self-start rounded-sm p-0 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground aria-expanded:bg-transparent"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? '收起' : '展示更多'}
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
            isUser
              ? 'chat-user-message w-fit max-w-[min(80%,56ch)] overflow-hidden break-words rounded-2xl rounded-br-lg border border-border/30 bg-gradient-to-br from-secondary to-muted px-3.5 py-2 text-base leading-[1.6] shadow-[var(--shadow-card)]'
              : 'min-w-0 flex-1 text-base leading-[1.6]',
          )}
        >
          {isUser ? (
            <UserMessageContent
              text={message.parts
                .filter(isTextUIPart)
                .map((part) => part.text)
                .join('')}
            />
          ) : (
            <StreamContent
              parts={parts}
              messageId={message.id}
              savedMessageIds={savedMessageIds}
              isStreaming={isStreaming}
            />
          )}
        </MessageContent>
      </div>
      <MessageActions message={message} isStreaming={isStreaming} />
    </Message>
  );
}
