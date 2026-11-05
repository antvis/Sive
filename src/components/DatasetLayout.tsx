import { cx } from '../shared/cx';
import { useLayoutEffect, useState, type ReactNode } from 'react';
import { Group, Panel, Separator, usePanelRef } from 'react-resizable-panels';
import { CaretLeftIcon, CaretRightIcon, DotsSixVerticalIcon } from '@phosphor-icons/react';
import { Button } from './ui';

export default function DatasetLayout({
  dataOpen,
  onDataOpenChange,
  data,
  children,
}: {
  dataOpen: boolean;
  onDataOpenChange: (open: boolean) => void;
  data: ReactNode;
  children: ReactNode;
}) {
  const panel = usePanelRef();
  // Seed both panel sizes before registration, including cached/hidden content.
  const [initialLayout] = useState(() => ({
    'analysis-pane': dataOpen ? 52 : 100,
    'data-pane': dataOpen ? 48 : 0,
  }));
  useLayoutEffect(() => {
    if (dataOpen) panel.current?.expand();
    else panel.current?.collapse();
  }, [dataOpen, panel]);
  return (
    <Group
      className={cx(
        "dataset-detail relative h-full min-h-0 overflow-hidden [&_>_[data-panel]]:[transition:flex-grow_220ms_cubic-bezier(0.2,_0,_0,_1)] [&:has([data-separator='active'])_>_[data-panel]]:transition-none [&:not(.with-data)_.conversation-body]:px-[max(20px,_calc((100%_-_940px)_/_2))] [&:not(.with-data)_.composer]:px-[max(20px,_calc((100%_-_940px)_/_2))] [&:has([data-separator='active'])]:cursor-col-resize [&:has([data-separator='active'])]:select-none [&:has([data-separator='active'])_iframe]:pointer-events-none [&:not(.with-data)_.data-panel]:px-0 [&:not(.with-data)_.data-panel]:opacity-0 [&:not(.with-data)_.data-panel]:pointer-events-none [&:not(.with-data)_>_.dataset-divider]:w-0 [&:not(.with-data)_>_.dataset-divider]:invisible [&_.conversation-body]:[transition:padding-inline_220ms_cubic-bezier(0.2,_0,_0,_1)] [&_.composer]:[transition:padding-inline_220ms_cubic-bezier(0.2,_0,_0,_1)] motion-reduce:[&_>_[data-panel]]:transition-none motion-reduce:[&_.conversation-body]:transition-none motion-reduce:[&_.composer]:transition-none",
        dataOpen ? ' with-data' : '',
      )}
      orientation="horizontal"
      defaultLayout={initialLayout}
    >
      <Panel
        id="analysis-pane"
        className="h-full min-h-0 min-w-0 [&_>_.conversation]:h-full [&_>_.conversation]:min-h-0 [&_>_.conversation]:min-w-0 [&_>_.data-panel]:h-full [&_>_.data-panel]:min-h-0 [&_>_.data-panel]:min-w-0 overflow-hidden"
        defaultSize={`${initialLayout['analysis-pane']}%`}
        minSize={340}
      >
        {children}
      </Panel>
      <Separator
        className="dataset-divider group/divider relative w-1.5 cursor-col-resize touch-none outline-none"
        disabled={!dataOpen}
        aria-label="调整分析会话与数据面板宽度"
        title="拖动调整宽度，双击恢复默认"
        aria-hidden={!dataOpen}
        inert={!dataOpen}
      >
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-1 flex h-6 w-3 -translate-y-1/2 items-center justify-center rounded-sm text-muted opacity-0 transition-[color,opacity] group-hover/divider:text-accent group-hover/divider:opacity-100 group-focus-visible/divider:text-accent group-focus-visible/divider:opacity-100 group-focus-visible/divider:ring-2 group-focus-visible/divider:ring-accent/30 group-data-[separator=active]/divider:text-accent group-data-[separator=active]/divider:opacity-100 motion-reduce:transition-none"
        >
          <DotsSixVerticalIcon size={14} weight="bold" />
        </span>
      </Separator>
      <Panel
        id="data-pane"
        className="h-full min-h-0 min-w-0 [&_>_.conversation]:h-full [&_>_.conversation]:min-h-0 [&_>_.conversation]:min-w-0 [&_>_.data-panel]:h-full [&_>_.data-panel]:min-h-0 [&_>_.data-panel]:min-w-0 overflow-hidden"
        panelRef={panel}
        defaultSize={`${initialLayout['data-pane']}%`}
        minSize={380}
        collapsible
        collapsedSize="0%"
        onResize={(size, _id, previous) => {
          if (previous && (size.asPercentage === 0) !== (previous.asPercentage === 0))
            onDataOpenChange(size.asPercentage > 0);
        }}
      >
        {data}
      </Panel>
      <Button
        className="absolute top-3 right-4 z-3"
        size="small"
        title={dataOpen ? '收起数据面板' : '展开数据面板'}
        aria-label={dataOpen ? '收起数据面板' : '展开数据面板'}
        aria-expanded={dataOpen}
        icon={dataOpen ? <CaretRightIcon /> : <CaretLeftIcon />}
        onClick={() => onDataOpenChange(!dataOpen)}
      />
    </Group>
  );
}
