import { isTextUIPart } from 'ai';
import type { ChatMessage } from '@shared/api';
import { CopyIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { formatMessageTime } from '../../utils';
import { MessageAction as Action, MessageActions as Actions } from '../ai-elements/message';

export function MessageActions({ message, isStreaming }: { message: ChatMessage; isStreaming: boolean }) {
  const text = message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join('\n')
    .trim();
  const createdAt = message.metadata?.createdAt;
  const time = createdAt ? formatMessageTime(createdAt) : '';

  if (isStreaming || (!text && !time)) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('已复制');
    } catch {
      toast.error('复制失败，请重试');
    }
  };

  return (
    <Actions
      className={cn(
        'opacity-0 transition-opacity duration-150 group-hover/message:opacity-100 group-focus-within/message:opacity-100',
        message.role === 'user' ? '-mr-0.5 justify-end' : '-ml-0.5',
      )}
    >
      {text && (
        <Action
          className="size-7 text-muted-foreground/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          label="复制消息"
          tooltip="复制"
          onClick={copy}
        >
          <CopyIcon className="size-3.5" aria-hidden="true" />
        </Action>
      )}
      {createdAt && time && (
        <time
          dateTime={createdAt}
          title={new Date(createdAt).toLocaleString('zh-CN')}
          className={cn('px-1 text-xs text-muted-foreground/50', message.role === 'user' && 'order-first')}
        >
          {time}
        </time>
      )}
    </Actions>
  );
}
