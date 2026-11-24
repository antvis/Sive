import clsx from 'clsx';
import { PanelLeftIcon, XIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { panelContentTiming } from '../lib/panel-layout';
import type { DatasetSummary } from '../types';
import { DataSourceLogo } from './DataSourceLogo';
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

type DatasetTabProps = {
  dataset: DatasetSummary;
  active: boolean;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
};

function DatasetTab({ dataset, active, onSelect, onClose }: DatasetTabProps) {
  return (
    <div
      className={clsx(
        'group relative flex h-8 min-w-28 max-w-52 flex-1 items-center rounded-md',
        active && 'bg-workspace-control text-ink',
      )}
    >
      <button
        type="button"
        className={clsx(
          'flex h-full min-w-0 flex-1 items-center gap-1.5 rounded-md px-3 pr-7 text-left text-base [-webkit-app-region:no-drag]',
          active ? 'text-ink' : 'text-muted-foreground hover:bg-workspace-control/70',
        )}
        onClick={() => onSelect(dataset.id)}
      >
        <DataSourceLogo type={dataset.sourceType} size={14} />
        <span className="min-w-0 truncate">{dataset.name}</span>
      </button>
      <button
        type="button"
        aria-label={`关闭 ${dataset.name}`}
        title={`关闭 ${dataset.name}`}
        className={clsx(
          'absolute right-1.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-muted-foreground transition-opacity [-webkit-app-region:no-drag] hover:bg-workspace-control-active hover:text-ink',
          active ? 'opacity-100' : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100',
        )}
        onClick={(event) => {
          event.stopPropagation();
          onClose(dataset.id);
        }}
      >
        <XIcon size={12} />
      </button>
    </div>
  );
}

type Props = {
  page: AppPage;
  datasets: DatasetSummary[];
  tabs: DatasetSummary[];
  activeDatasetId: string | null;
  showSidebarActions: boolean;
  fullscreen: boolean;
  conversationTitle?: ReactNode;
  onOpenSidebar: () => void;
  onConversationCreate: (datasetId: string) => void;
  onDatasetSelect: (id: string) => void;
  onDatasetClose: (id: string) => void;
};

export function WorkspaceTitleBar({
  page,
  datasets,
  tabs,
  activeDatasetId,
  showSidebarActions,
  fullscreen,
  conversationTitle,
  onOpenSidebar,
  onConversationCreate,
  onDatasetSelect,
  onDatasetClose,
}: Props) {
  return (
    <header
      className={clsx(
        'flex h-(--workspace-titlebar-height) min-w-0 flex-1 items-center px-3 [-webkit-app-region:drag] motion-safe:transition-[padding-inline-start]',
        panelContentTiming,
        fullscreen
          ? 'ps-(--window-titlebar-padding)'
          : showSidebarActions && 'ps-(--workspace-titlebar-padding)',
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
      <div className="flex h-full min-w-0 flex-1 items-center gap-2">
        {conversationTitle}
        {tabs.length ? (
          <div
            className={clsx(
              'flex h-full min-w-0 items-center gap-1 overflow-x-auto [-webkit-app-region:no-drag]',
              conversationTitle && 'max-w-[45%] shrink-0',
            )}
          >
            {tabs.map((dataset) => (
              <DatasetTab
                key={dataset.id}
                dataset={dataset}
                active={activeDatasetId === dataset.id}
                onSelect={onDatasetSelect}
                onClose={onDatasetClose}
              />
            ))}
          </div>
        ) : (
          !conversationTitle && <span className="truncate text-base text-muted-foreground">{pageTitles[page]}</span>
        )}
      </div>
    </header>
  );
}
