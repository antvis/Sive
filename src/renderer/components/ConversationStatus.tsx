import { i18n, useI18n } from '../i18n';
import { CircleIcon, LoaderCircleIcon } from 'lucide-react';
import { useConversationStatus } from '../hooks/useConversationStatus';

export function ConversationStatus({ ids }: { ids: string[] }) {
  useI18n();
  const status = useConversationStatus(ids);
  if (status === 'idle') return null;

  const label =
    status === 'running' ? i18n('conversation.status.running') : i18n('conversation.status.unread');
  return (
    <span
      title={label}
      role="img"
      aria-label={label}
      className="grid size-4 shrink-0 place-items-center text-accent"
    >
      {status === 'running' ? (
        <LoaderCircleIcon size={14} className="animate-spin" aria-hidden />
      ) : (
        <CircleIcon size={8} fill="currentColor" aria-hidden />
      )}
    </span>
  );
}
