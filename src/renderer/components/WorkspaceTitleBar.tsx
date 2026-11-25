import clsx from 'clsx';
import { PanelLeftIcon, SquarePenIcon } from 'lucide-react';
import type { DatasetSummary } from '../types';
import { ConversationStatus } from './ConversationStatus';
import { WORKSPACE_SIDEBAR_ID } from './WorkspaceSidebar';
import type { AppPage } from './WorkspaceSidebar';
import { Button } from './ui/button';

const pageTitles: Record<AppPage, string> = {
  welcome: '数据源',
  datasets: '数据源',
  analysis: '数据分析',
  snippets: '洞察 Snippet',
};

type Props = {
  page: AppPage;
  datasets: DatasetSummary[];
  activeDatasetId: string | null;
  showSidebarActions: boolean;
  conversationTitle?: string;
  activeConversationId: string | null;
  onOpenSidebar: () => void;
  onConversationCreate: (datasetId: string) => void;
};

export function WorkspaceTitleBar({
  page,
  datasets,
  activeDatasetId,
  showSidebarActions,
  conversationTitle,
  activeConversationId,
  onOpenSidebar,
  onConversationCreate,
}: Props) {
  const initialDatasetId = activeDatasetId ?? datasets[0]?.id;

  return (
    <header
      className={clsx(
        'flex h-(--workspace-titlebar-height) min-w-0 flex-1 items-center px-3 [-webkit-app-region:drag] motion-safe:transition-[padding-inline-start]',
        'motion-safe:duration-[320ms] motion-safe:ease-[cubic-bezier(.22,1,.36,1)]',
        showSidebarActions && 'ps-(--workspace-titlebar-padding)',
      )}
    >
      <div
        inert={!showSidebarActions}
        className={clsx(
          'flex shrink-0 overflow-hidden [-webkit-app-region:no-drag] motion-safe:transition-[width,opacity]',
          'motion-safe:duration-[320ms] motion-safe:ease-[cubic-bezier(.22,1,.36,1)]',
          showSidebarActions ? 'w-[72px] opacity-100' : 'w-0 opacity-0',
        )}
      >
        <div className="flex shrink-0 items-center gap-1 pe-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="展开侧边栏"
            title="展开侧边栏"
            aria-controls={WORKSPACE_SIDEBAR_ID}
            aria-expanded={false}
            onClick={onOpenSidebar}
          >
            <PanelLeftIcon className="size-[16px]" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="新建对话"
            title={initialDatasetId ? '新建对话' : '请先添加数据源'}
            disabled={!initialDatasetId}
            onClick={() => {
              if (initialDatasetId) onConversationCreate(initialDatasetId);
            }}
          >
            <SquarePenIcon className="size-[16px]" aria-hidden />
          </Button>
        </div>
      </div>
      <div className="flex h-full min-w-0 flex-1 items-center">
        {conversationTitle === undefined ? (
          <span className="truncate text-base text-muted-foreground">{pageTitles[page]}</span>
        ) : (
          <div className="flex min-w-0 items-center gap-1 px-2">
            <span className="min-w-0 truncate text-base font-semibold text-ink" title={conversationTitle}>
              {conversationTitle}
            </span>
            <ConversationStatus ids={activeConversationId ? [activeConversationId] : []} />
          </div>
        )}
      </div>
    </header>
  );
}
