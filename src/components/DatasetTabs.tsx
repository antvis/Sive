import { useEffect, useRef } from 'react';
import { DatabaseIcon, PlusIcon, XIcon } from '@phosphor-icons/react';
import type { Dataset } from '../../shared/contracts';
import { Button, Dropdown } from './ui';

export default function DatasetTabs({
  datasets,
  tabs,
  selectedId,
  onSelect,
  onClose,
  onOpenData,
}: {
  datasets: Dataset[];
  tabs: { id: string; datasetId: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  onOpenData: (dataset: Dataset) => void;
  onClose: (id: string) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = list.current;
    const active = container?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!container || !active) return;
    const item = active.parentElement!;
    const left =
      item.getBoundingClientRect().left - container.getBoundingClientRect().left + container.scrollLeft;
    if (left < container.scrollLeft) container.scrollLeft = left;
    else if (left + item.offsetWidth > container.scrollLeft + container.clientWidth)
      container.scrollLeft = left + item.offsetWidth - container.clientWidth;
  }, [selectedId, tabs]);
  return (
    <div className="dataset-tabs-bar">
      <div className="dataset-tabs" role="tablist" aria-label="工作标签" ref={list}>
        {tabs.map((dataset, index) => (
          <div key={dataset.id} className="dataset-tab" data-selected={selectedId === dataset.id}>
            <button
              type="button"
              role="tab"
              aria-selected={selectedId === dataset.id}
              aria-controls="workspace-panel"
              tabIndex={
                selectedId === dataset.id || (!tabs.some((entry) => entry.id === selectedId) && index === 0)
                  ? 0
                  : -1
              }
              title={dataset.name}
              onClick={() => onSelect(dataset.id)}
              onKeyDown={(event) => {
                if (event.key === 'Delete') {
                  event.preventDefault();
                  onClose(dataset.id);
                  return;
                }
                let next = index;
                if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
                else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
                else if (event.key === 'Home') next = 0;
                else if (event.key === 'End') next = tabs.length - 1;
                else return;
                event.preventDefault();
                list.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
                onSelect(tabs[next].id);
              }}
            >
              <DatabaseIcon />
              <span>{dataset.name}</span>
            </button>
            <button
              type="button"
              className="dataset-tab-close"
              aria-label={`关闭标签：${dataset.name}`}
              title="关闭标签"
              onClick={() => onClose(dataset.id)}
            >
              <XIcon />
            </button>
          </div>
        ))}
      </div>
      <Dropdown
        disabled={!datasets.length}
        menu={{
          items: datasets.map((dataset) => ({ key: dataset.id, label: dataset.name })),
          selectedKeys: tabs.filter((tab) => tab.id === selectedId).map((tab) => tab.datasetId),
          onClick: ({ key }) => {
            const dataset = datasets.find((entry) => entry.id === key);
            if (dataset) onOpenData(dataset);
          },
        }}
        style={{ maxWidth: 360, maxHeight: 320, overflowY: 'auto' }}
      >
        <Button
          variant="ghost"
          size="small"
          disabled={!datasets.length}
          aria-label="打开数据标签"
          title="打开数据标签"
        >
          <PlusIcon />
        </Button>
      </Dropdown>
    </div>
  );
}
