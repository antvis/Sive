import { ChevronDownIcon } from 'lucide-react';
import type { Conversation, DatasetSummary } from '../types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

type Props = {
  datasets: DatasetSummary[];
  conversationsByDataset: ReadonlyMap<string, Conversation[]>;
  activeDatasetId: string | null;
  activeConversationId: string | null;
  onConversationSelect: (conversation: Conversation) => void;
};

export function ConversationSwitcher({
  datasets,
  conversationsByDataset,
  activeDatasetId,
  activeConversationId,
  onConversationSelect,
}: Props) {
  const title =
    conversationsByDataset
      .get(activeDatasetId ?? '')
      ?.find((conversation) => conversation.id === activeConversationId)?.title ?? '新对话';
  const groups = datasets.flatMap((dataset) => {
    const conversations = conversationsByDataset.get(dataset.id);
    return conversations?.length ? [{ dataset, conversations }] : [];
  });

  if (!groups.length)
    return <span className="min-w-0 flex-1 truncate px-2 text-sm font-semibold">{title}</span>;

  return (
    <div className="min-w-0 flex-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`切换对话，当前对话：${title}`}
            title={title}
            className="flex h-8 max-w-full items-center gap-1 rounded-lg px-2 text-left text-sm font-semibold text-ink transition-colors [-webkit-app-region:no-drag] hover:bg-workspace-control focus-visible:outline-2 focus-visible:outline-sidebar-focus data-[state=open]:bg-workspace-control"
          >
            <span className="min-w-0 truncate">{title}</span>
            <ChevronDownIcon size={14} className="shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          aria-label="切换对话"
          collisionPadding={8}
          className="max-h-[min(360px,var(--radix-dropdown-menu-content-available-height))] w-72 max-w-[calc(100vw-16px)] min-w-0 bg-workspace-control-active text-ink shadow-lg"
        >
          <DropdownMenuRadioGroup value={activeConversationId ?? ''}>
            {groups.map(({ dataset, conversations }) => (
              <DropdownMenuGroup key={dataset.id} aria-label={dataset.name}>
                <DropdownMenuLabel className="truncate" title={dataset.name}>
                  {dataset.name}
                </DropdownMenuLabel>
                {conversations.map((conversation) => (
                  <DropdownMenuRadioItem
                    key={conversation.id}
                    value={conversation.id}
                    textValue={conversation.title}
                    title={conversation.title}
                    className="focus:bg-workspace-control focus:text-ink focus:**:text-ink"
                    onSelect={() => {
                      if (conversation.id !== activeConversationId) onConversationSelect(conversation);
                    }}
                  >
                    <span className="min-w-0 truncate">{conversation.title}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuGroup>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
