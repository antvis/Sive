import clsx from 'clsx';
import { PanelLeftIcon } from 'lucide-react';
import { panelContentTiming } from '../lib/panel-layout';
import type { DatasetSummary } from '../types';
import { IconButton } from './IconButton';
import { NewConversationButton, WORKSPACE_SIDEBAR_ID } from './WorkspaceSidebar';
import type { AppPage } from './WorkspaceSidebar';

const pageTitles: Record<AppPage, string> = {
  welcome: '数据源',
  datasets: '数据源',
  analysis: '数据分析',
  snippets: '洞察 Snippet',
  settings: '设置',
};

type Props = {
  page: AppPage;
  datasets: DatasetSummary[];
  activeDatasetId: string | null;
  showSidebarActions: boolean;
  conversationTitle?: string;
  onOpenSidebar: () => void;
  onConversationCreate: (datasetId: string) => void;
};

export function WorkspaceTitleBar({
  page,
  datasets,
  activeDatasetId,
  showSidebarActions,
  conversationTitle,
  onOpenSidebar,
  onConversationCreate,
}: Props) {
  return (
    <header
      className={clsx(
        'flex h-(--workspace-titlebar-height) min-w-0 flex-1 items-center px-3 [-webkit-app-region:drag] motion-safe:transition-[padding-inline-start]',
        panelContentTiming,
        showSidebarActions && 'ps-(--workspace-titlebar-padding)',
      )}
    >
      <div
        inert={!showSidebarActions}
        className={clsx(
          'flex shrink-0 overflow-hidden [-webkit-app-region:no-drag] motion-safe:transition-[width,opacity]',
          panelContentTiming,
          showSidebarActions ? 'w-[72px] opacity-100' : 'w-0 opacity-0',
        )}
      >
        <div className="flex shrink-0 items-center gap-1 pe-2">
          <IconButton
            icon={PanelLeftIcon}
            iconSize={18}
            label="展开侧边栏"
            aria-controls={WORKSPACE_SIDEBAR_ID}
            aria-expanded={false}
            className="size-[28px]! [-webkit-app-region:no-drag] focus-visible:outline-2 focus-visible:outline-sidebar-focus"
            onClick={onOpenSidebar}
          />
          <NewConversationButton
            compact
            datasets={datasets}
            datasetId={activeDatasetId}
            onCreate={onConversationCreate}
          />
        </div>
      </div>
      <div className="flex h-full min-w-0 flex-1 items-center">
        {conversationTitle === undefined ? (
          <span className="truncate text-base text-muted-foreground">{pageTitles[page]}</span>
        ) : (
          <span
            className="min-w-0 flex-1 truncate px-2 text-base font-semibold text-ink"
            title={conversationTitle}
          >
            {conversationTitle}
          </span>
        )}
      </div>
    </header>
  );
}
