import clsx from 'clsx';
import { Maximize2Icon, Minimize2Icon, PanelRightIcon } from 'lucide-react';
import { Tabs } from 'radix-ui';
import type { ReactNode, RefObject } from 'react';
import { DataSourceLogo } from '../../components/DataSourceLogo';
import { IconButton, panelControlClassName } from '../../components/IconButton';
import type { ToolPreviewTab } from '../../components/chat/tool-preview';
import { AnalyzeTool } from '../../components/chat/tools/analyze';
import { PanelTabList } from '../../components/ui/panel-tabs';
import type { DatasetSummary } from '../../types';
import { DatasetPanel } from './DatasetPanel';
import { DATASET_PREVIEW_ID } from './useAnalysisPreview';
import { DATASET_PREVIEW_TAB } from './useAnalysisTabs';

const tabContentClassName = 'min-h-0 min-w-0 flex-1 bg-surface data-[state=inactive]:hidden';

type Props = {
  dataset: Pick<DatasetSummary, 'id' | 'name' | 'sourceType'>;
  titleBar: ReactNode;
  fullscreen: boolean;
  collapsed: boolean;
  cardRef: RefObject<HTMLElement | null>;
  tabs: readonly ToolPreviewTab[];
  activeTabId: string;
  previewShortcut: string;
  onTabChange: (id: string) => void;
  onTabClose: (id: string) => void;
  onToggleFullscreen: () => void;
  onCollapse: () => void;
};

export function AnalysisSidePanel({
  dataset,
  titleBar,
  fullscreen,
  collapsed,
  cardRef,
  tabs,
  activeTabId,
  previewShortcut,
  onTabChange,
  onTabClose,
  onToggleFullscreen,
  onCollapse,
}: Props) {
  return (
    <Tabs.Root asChild value={activeTabId} onValueChange={onTabChange}>
      <section
        ref={cardRef}
        id={DATASET_PREVIEW_ID}
        className={clsx(
          'flex h-full min-h-0 w-full min-w-0 flex-col justify-self-end overflow-hidden rounded-[16px] bg-preview-surface motion-safe:transition-opacity motion-safe:duration-150',
          collapsed && !fullscreen && 'opacity-0',
          fullscreen ? 'fixed inset-y-0 right-0 z-40 rounded-none!' : 'relative z-10',
        )}
        role={fullscreen ? 'dialog' : undefined}
        aria-modal={fullscreen || undefined}
        aria-label="右侧面板"
        inert={collapsed && !fullscreen}
      >
        <div
          className={clsx(
            'flex h-(--workspace-titlebar-height) shrink-0 items-center gap-1 pe-[8px] [-webkit-app-region:drag]',
            !fullscreen && 'relative top-(--workspace-titlebar-row-offset) ps-[8px]',
          )}
        >
          {fullscreen && titleBar}
          <PanelTabList
            label="右侧面板标签"
            pinnedTab={{
              id: DATASET_PREVIEW_TAB,
              title: dataset.name,
              icon: <DataSourceLogo type={dataset.sourceType} size={14} />,
            }}
            tabs={tabs}
            activeTabId={activeTabId}
            visible={!collapsed || fullscreen}
            className={fullscreen ? 'max-w-[45%]' : 'flex-1'}
            onClose={onTabClose}
          />
          <IconButton
            icon={fullscreen ? Minimize2Icon : Maximize2Icon}
            label={fullscreen ? '退出右侧面板全屏' : '全屏查看右侧面板'}
            title={fullscreen ? '退出右侧面板全屏（Esc）' : '全屏查看右侧面板'}
            className={panelControlClassName}
            aria-pressed={fullscreen}
            onClick={onToggleFullscreen}
          />
          {!collapsed && !fullscreen && (
            <IconButton
              icon={PanelRightIcon}
              iconSize={18}
              label="收起右侧面板"
              className={panelControlClassName}
              aria-controls={DATASET_PREVIEW_ID}
              aria-expanded
              aria-keyshortcuts={previewShortcut}
              onClick={onCollapse}
            />
          )}
        </div>
        <Tabs.Content value={DATASET_PREVIEW_TAB} forceMount className={clsx(tabContentClassName, 'overflow-hidden')}>
          <DatasetPanel key={dataset.id} datasetId={dataset.id} />
        </Tabs.Content>
        {tabs.map(({ id, call }) => (
          <Tabs.Content
            key={id}
            value={id}
            forceMount
            className={clsx(
              tabContentClassName,
              'chat-theme overflow-auto p-4 text-base text-foreground [&_code]:font-chat-mono [&_pre]:font-chat-mono',
            )}
          >
            <AnalyzeTool call={call} sidePanel />
          </Tabs.Content>
        ))}
      </section>
    </Tabs.Root>
  );
}
