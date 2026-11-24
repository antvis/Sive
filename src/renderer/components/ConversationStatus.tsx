import { CircleIcon, LoaderCircleIcon } from 'lucide-react';
import { useConversationStatus } from '../hooks/useConversationStatus';

export function ConversationStatus({ ids }: { ids: string[] }) {
  const status = useConversationStatus(ids);
  if (status === 'idle') return null;

  const label = status === 'running' ? '正在运行' : '有内容未查收';
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
