import { useLayoutEffect, useState, type ReactNode } from 'react';
import { Group, Panel, Separator, usePanelRef } from 'react-resizable-panels';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
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
  // Changing defaultSize re-registers the panel and loses its expanded width.
  const [initialDataSize] = useState(() => (dataOpen ? '48%' : '0%'));
  useLayoutEffect(() => {
    if (dataOpen) panel.current?.expand();
    else panel.current?.collapse();
  }, [dataOpen, panel]);
  return (
    <Group className={'dataset-detail' + (dataOpen ? ' with-data' : '')} orientation="horizontal">
      <Panel
        id="analysis-pane"
        className="dataset-pane"
        defaultSize="52%"
        minSize={340}
        style={{ overflow: 'hidden' }}
      >
        {children}
      </Panel>
      <Separator
        className="dataset-divider"
        disabled={!dataOpen}
        aria-label="调整分析会话与数据面板宽度"
        title="拖动调整宽度，双击恢复默认"
        aria-hidden={!dataOpen}
        inert={!dataOpen}
      />
      <Panel
        id="data-pane"
        className="dataset-pane"
        panelRef={panel}
        defaultSize={initialDataSize}
        minSize={380}
        collapsible
        collapsedSize="0%"
        style={{ overflow: 'hidden' }}
        onResize={(size, _id, previous) => {
          if (previous && (size.asPercentage === 0) !== (previous.asPercentage === 0))
            onDataOpenChange(size.asPercentage > 0);
        }}
      >
        {data}
      </Panel>
      <Button
        className="data-panel-toggle"
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
