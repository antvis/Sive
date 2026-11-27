import { useI18n } from '../../i18n';
import type { ChatMessage } from '@shared/api';
import { CopyIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { formatMessageTime } from '../../utils';
import { MessageAction as Action, MessageActions as Actions } from '../ai-elements/message';
import { getTextFromUIMessage } from './util';

export function MessageActions({ message, isStreaming }: { message: ChatMessage; isStreaming: boolean }) {
  const i18n = useI18n();
  const text = getTextFromUIMessage(message, '\n').trim();
  const createdAt = message.metadata?.createdAt;
  const time = createdAt ? formatMessageTime(createdAt) : '';

  if (isStreaming || (!text && !time)) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(i18n('common.status.copied'));
    } catch {
      toast.error(i18n('errors.clipboard.copyFailed'));
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
          className="size-7 text-muted-foreground/50 hover:text-foreground focus-visible:ring-1 focus-visible:ring-focus"
          label={i18n('chat.actions.copyMessage')}
          tooltip={i18n('common.actions.copy')}
          onClick={copy}
        >
          <CopyIcon className="size-3.5" aria-hidden="true" />
        </Action>
      )}
      {createdAt && time && (
        <time
          dateTime={createdAt}
          title={new Date(createdAt).toLocaleString(i18n.locale)}
          className={cn('px-1 text-xs text-muted-foreground/50', message.role === 'user' && 'order-first')}
        >
          {time}
        </time>
      )}
    </Actions>
  );
}
