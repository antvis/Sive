import clsx from 'clsx';
import { Maximize2Icon, Minimize2Icon, PanelRightIcon } from 'lucide-react';
import { Tabs } from 'radix-ui';
import { useEffect, useEffectEvent, useLayoutEffect, useRef } from 'react';
import { DataSourceLogo } from '../../components/DataSourceLogo';
import { IconButton } from '../../components/IconButton';
import type { ToolPreviewTab } from '../../components/chat/tool-preview';
import { AnalyzeTool } from '../../components/chat/tools/analyze';
import { PanelTabList } from '../../components/ui/panel-tabs';
import { panelAnimationTiming } from '../../lib/panel-layout';
import type { DatasetSummary } from '../../types';
import { DatasetPanel } from './DatasetPanel';
import { DATASET_PREVIEW_TAB } from './useAnalysisTabs';

export const DATASET_PREVIEW_ID = 'dataset';

export const PREVIEW_SHORTCUT = 'Meta+Shift+B Control+Shift+B';

const tabContentClassName = 'min-h-0 min-w-0 flex-1 bg-surface data-[state=inactive]:hidden';

type Props = {
  dataset: Pick<DatasetSummary, 'id' | 'name' | 'sourceType'>;
  fullscreen: boolean;
  collapsed: boolean;
  tabs: readonly ToolPreviewTab[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  onTabClose: (id: string) => void;
  onFullscreenChange: (fullscreen: boolean) => void;
  onToggleCollapsed: () => void;
};

export function AnalysisSidePanel({
  dataset,
  fullscreen,
  collapsed,
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onFullscreenChange,
  onToggleCollapsed,
}: Props) {
  const card = useRef<HTMLElement>(null);
  const previousBounds = useRef<DOMRect | null>(null);

  useLayoutEffect(() => {
    const element = card.current;
    const from = previousBounds.current;
    previousBounds.current = null;
    if (!element || !from) return;

    const to = element.getBoundingClientRect();
    const animation = element.animate(
      [
        {
          width: `${from.width}px`,
          height: `${from.height}px`,
          transform: `translate(${from.right - to.right}px, ${from.top - to.top}px)`,
        },
        { width: '100%', height: '100%', transform: 'translate(0px, 0px)' },
      ],
      panelAnimationTiming,
    );
    return () => animation.cancel();
  }, [fullscreen]);

  const toggleFullscreen = () => {
    previousBounds.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? null
      : (card.current?.getBoundingClientRect() ?? null);
    onFullscreenChange(!fullscreen);
  };

  const handleShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.repeat) return;

    if (fullscreen && event.key === 'Escape') {
      event.preventDefault();
      toggleFullscreen();
    } else if (
      !fullscreen &&
      (event.metaKey || event.ctrlKey) &&
      event.shiftKey &&
      !event.altKey &&
      event.key.toLowerCase() === 'b'
    ) {
      event.preventDefault();
      onToggleCollapsed();
    }
  });

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => handleShortcut(event);
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);

  return (
    <Tabs.Root asChild value={activeTabId} onValueChange={onTabChange}>
      <section
        ref={card}
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
            fullscreen
              ? 'ps-(--window-titlebar-padding)'
              : 'relative top-(--workspace-titlebar-row-offset) ps-[8px]',
          )}
        >
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
            className="flex-1"
            onClose={onTabClose}
          />
          <IconButton
            icon={fullscreen ? Minimize2Icon : Maximize2Icon}
            label={fullscreen ? '退出右侧面板全屏' : '全屏查看右侧面板'}
            title={fullscreen ? '退出右侧面板全屏（Esc）' : '全屏查看右侧面板'}
            className="size-[28px]! [-webkit-app-region:no-drag] focus-visible:outline-2 focus-visible:outline-sidebar-focus"
            aria-pressed={fullscreen}
            onClick={toggleFullscreen}
          />
          {!collapsed && !fullscreen && (
            <IconButton
              icon={PanelRightIcon}
              iconSize={18}
              label="收起右侧面板"
              className="size-[28px]! [-webkit-app-region:no-drag] focus-visible:outline-2 focus-visible:outline-sidebar-focus"
              aria-controls={DATASET_PREVIEW_ID}
              aria-expanded
              aria-keyshortcuts={PREVIEW_SHORTCUT}
              onClick={onToggleCollapsed}
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
