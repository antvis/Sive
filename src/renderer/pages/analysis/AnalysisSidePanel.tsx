import clsx from 'clsx';
import { Maximize2Icon, Minimize2Icon, PanelRightIcon, Table2Icon } from 'lucide-react';
import { Tabs } from 'radix-ui';
import type { RefObject } from 'react';
import { DataSourceLogo } from '../../components/DataSourceLogo';
import { Button } from '../../components/Button';
import { IconButton, panelControlClassName } from '../../components/IconButton';
import { AnalyzeTool } from '../../components/chat/tools/analyze';
import { PanelTabList } from '../../components/ui/panel-tabs';
import type { DatasetSummary } from '../../types';
import { DatasetPanel } from './DatasetPanel';
import { DATASET_PREVIEW_ID } from './useAnalysisPreview';
import type { AnalysisTab } from './useAnalysisTabs';

const tabContentClassName = 'min-h-0 min-w-0 flex-1 bg-surface data-[state=inactive]:hidden';

type Props = {
  dataset: Pick<DatasetSummary, 'id' | 'name' | 'sourceType'>;
  fullscreen: boolean;
  collapsed: boolean;
  cardRef: RefObject<HTMLElement | null>;
  tabs: readonly AnalysisTab[];
  activeTabId: string;
  previewShortcut: string;
  onTabChange: (id: string) => void;
  onTabClose: (id: string) => void;
  onOpenDataset: () => void;
  onToggleFullscreen: () => void;
  onCollapse: () => void;
};

export function AnalysisSidePanel({
  dataset,
  fullscreen,
  collapsed,
  cardRef,
  tabs,
  activeTabId,
  previewShortcut,
  onTabChange,
  onTabClose,
  onOpenDataset,
  onToggleFullscreen,
  onCollapse,
}: Props) {
  const hasDataset = tabs.some((tab) => tab.kind === 'dataset');

  return (
    <Tabs.Root asChild value={activeTabId} onValueChange={onTabChange}>
      <section
        ref={cardRef}
        id={DATASET_PREVIEW_ID}
        className={clsx(
          'flex h-full min-h-0 w-full min-w-0 flex-col justify-self-end overflow-clip rounded-[16px] bg-preview-surface motion-safe:transition-opacity motion-safe:duration-150',
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
            fullscreen ? 'ps-(--window-titlebar-padding)' : 'ps-[8px]',
          )}
        >
          <PanelTabList
            label="右侧面板标签"
            tabs={tabs.map((tab) =>
              tab.kind === 'dataset'
                ? {
                    id: tab.id,
                    title: dataset.name,
                    icon: <DataSourceLogo type={dataset.sourceType} size={14} />,
                  }
                : tab,
            )}
            activeTabId={activeTabId}
            visible={!collapsed || fullscreen}
            className="flex-1"
            onClose={onTabClose}
          />
          {!hasDataset && !!tabs.length && (
            <IconButton
              icon={Table2Icon}
              label="打开数据预览"
              className={panelControlClassName}
              onClick={onOpenDataset}
            />
          )}
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
        {tabs.map((tab) => (
          <Tabs.Content
            key={tab.id}
            value={tab.id}
            forceMount
            className={clsx(
              tabContentClassName,
              tab.kind === 'dataset'
                ? 'overflow-hidden'
                : 'chat-theme overflow-auto p-4 text-base text-foreground [&_code]:font-chat-mono [&_pre]:font-chat-mono',
            )}
          >
            {tab.kind === 'dataset' ? (
              <DatasetPanel key={dataset.id} datasetId={dataset.id} />
            ) : (
              <AnalyzeTool call={tab.call} sidePanel />
            )}
          </Tabs.Content>
        ))}
        {!tabs.length && (
          <div className="grid min-h-0 flex-1 place-content-center bg-surface p-4">
            <Button autoFocus={!collapsed || fullscreen} onClick={onOpenDataset}>
              打开数据预览
            </Button>
          </div>
        )}
      </section>
    </Tabs.Root>
  );
}
