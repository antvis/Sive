import clsx from 'clsx';
import { PanelLeftIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { panelContentTiming } from '../lib/panel-layout';
import type { DatasetSummary } from '../types';
import { IconButton, panelControlClassName } from './IconButton';
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
  fullscreen: boolean;
  conversationTitle?: ReactNode;
  onOpenSidebar: () => void;
  onConversationCreate: (datasetId: string) => void;
};

export function WorkspaceTitleBar({
  page,
  datasets,
  activeDatasetId,
  showSidebarActions,
  fullscreen,
  conversationTitle,
  onOpenSidebar,
  onConversationCreate,
}: Props) {
  return (
    <header
      className={clsx(
        'flex h-(--workspace-titlebar-height) min-w-0 items-center px-3 [-webkit-app-region:drag] motion-safe:transition-[padding-inline-start]',
        panelContentTiming,
        fullscreen ? 'shrink-0' : 'flex-1',
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
            className={panelControlClassName}
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
        {conversationTitle ?? <span className="truncate text-base text-muted-foreground">{pageTitles[page]}</span>}
      </div>
    </header>
  );
}
