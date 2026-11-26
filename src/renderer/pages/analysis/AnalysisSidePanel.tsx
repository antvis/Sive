import { Tabs, TabsContent } from '../../components/ui/tabs';
import clsx from 'clsx';
import { ChartNoAxesCombinedIcon, Maximize2Icon, Minimize2Icon, PanelRightIcon, Table2Icon } from 'lucide-react';
import { useEffect, useEffectEvent, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { DataSourceLogo } from '../../components/DataSourceLogo';
import { AnalyzeTool } from '../../components/chat/tools/analyze';
import { Button } from '../../components/ui/button';
import { PanelTabList } from '../../components/ui/panel-tabs';
import type { DatasetSummary } from '../../types';
import { DatasetPanel } from './DatasetPanel';
import type { AnalysisTab } from './useAnalysisTabs';

export const DATASET_PREVIEW_ID = 'dataset';


type Props = {
  dataset: Pick<DatasetSummary, 'id' | 'name' | 'sourceType'>;
  fullscreen: boolean;
  fullscreenButtonRef: RefObject<HTMLButtonElement | null>;
  collapsed: boolean;
  tabs: readonly AnalysisTab[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  onTabClose: (id: string) => void;
  onOpenDataset: () => void;
  onFullscreenChange: (fullscreen: boolean) => void;
  onToggleCollapsed: () => void;
};

export function AnalysisSidePanel({
  dataset,
  fullscreen,
  fullscreenButtonRef,
  collapsed,
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onOpenDataset,
  onFullscreenChange,
  onToggleCollapsed,
}: Props) {
  const hasDataset = tabs.some((tab) => tab.kind === 'dataset');
  const FullscreenIcon = fullscreen ? Minimize2Icon : Maximize2Icon;
  const fullscreenLabel = fullscreen ? '退出右侧面板全屏' : '全屏查看右侧面板';
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
      { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' },
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
    <Tabs asChild value={activeTabId} onValueChange={onTabChange}>
      <section
        ref={card}
        id={DATASET_PREVIEW_ID}
        className={clsx(
          'flex h-full min-h-0 w-full min-w-0 flex-col justify-self-end overflow-clip rounded-2xl bg-surface motion-safe:transition-opacity motion-safe:duration-150',
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
            'flex h-(--workspace-titlebar-height) shrink-0 items-center gap-1 pe-2 [-webkit-app-region:drag]',
            fullscreen ? 'ps-(--window-titlebar-padding)' : 'ps-2',
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
                : { ...tab, icon: <ChartNoAxesCombinedIcon size={14} className="shrink-0" aria-hidden /> },
            )}
            activeTabId={activeTabId}
            visible={!collapsed || fullscreen}
            className="flex-1"
            onClose={onTabClose}
          />
          {!hasDataset && !!tabs.length && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="打开数据预览"
              title="打开数据预览"
              className="text-muted-foreground"
              onClick={onOpenDataset}
            >
              <Table2Icon className="size-[14px]" aria-hidden />
            </Button>
          )}
          <Button
            ref={fullscreenButtonRef}
            variant="ghost"
            size="icon-sm"
            aria-label={fullscreenLabel}
            title={fullscreen ? `${fullscreenLabel}（Esc）` : fullscreenLabel}
            className="text-muted-foreground"
            aria-pressed={fullscreen}
            onClick={toggleFullscreen}
          >
            <FullscreenIcon className="size-[14px]" aria-hidden />
          </Button>
          {!collapsed && !fullscreen && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="收起右侧面板"
              title="收起右侧面板"
              className="text-muted-foreground"
              aria-controls={DATASET_PREVIEW_ID}
              aria-expanded
              aria-keyshortcuts="Meta+Shift+B Control+Shift+B"
              onClick={onToggleCollapsed}
            >
              <PanelRightIcon className="size-[16px]" aria-hidden />
            </Button>
          )}
        </div>
        {tabs.map((tab) => (
          <TabsContent
            key={tab.id}
            value={tab.id}
            forceMount
            className={clsx(
              'min-h-0 flex-1 data-[state=inactive]:hidden',
              tab.kind === 'dataset'
                ? 'overflow-hidden'
                : 'overflow-auto p-4 text-sm text-foreground [&_code]:font-chat-mono [&_pre]:font-chat-mono',
            )}
          >
            {tab.kind === 'dataset' ? (
              <DatasetPanel key={dataset.id} datasetId={dataset.id} />
            ) : (
              <AnalyzeTool call={tab.call} sidePanel />
            )}
          </TabsContent>
        ))}
      </section>
    </Tabs>
  );
}
