import { useEffect, useRef, useState } from 'react';
import { DatabaseIcon, PlusIcon, XIcon, SidebarSimpleIcon } from '@phosphor-icons/react';
import type { Dataset } from '../../shared/contracts';
import { Button } from './ui';
import DatasetPickerDialog from './DatasetPickerDialog';

export default function DatasetTabs({
  sidebarOpen,
  onToggleSidebar,
  datasets,
  tabs,
  selectedId,
  onSelect,
  onClose,
  onOpenData,
  onAddData,
}: {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  datasets: Dataset[];
  tabs: { id: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  onOpenData: (dataset: Dataset) => void;
  onAddData: () => void;
  onClose: (id: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
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
    <div className="dataset-tabs-bar mac:min-h-9 mac:[-webkit-app-region:drag] mac:after:content-[''] mac:after:flex-[1_0_40px] mac:after:self-stretch mac:[&_button]:[-webkit-app-region:no-drag] mac:[.sidebar-collapsed_&]:pl-21 mac:[transition:padding-left_220ms_cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none flex items-end gap-1 pt-1 pr-2.5 pb-0 pl-2.5 min-w-0 shrink-0 shadow-[inset_0_-1px_var(--border)] bg-page [&_>_.ui-button]:shrink-0 [&_>_.ui-button]:self-center [&_>_.ui-button]:w-7 [&_>_.ui-button]:h-7 [&_>_.ui-button]:min-h-0 [&_>_.ui-button]:mb-0.5 [&_>_.ui-button]:p-[5px]">
      <Button
        variant="ghost"
        size="small"
        icon={<SidebarSimpleIcon />}
        aria-label={sidebarOpen ? '收起侧栏' : '展开侧栏'}
        title={sidebarOpen ? '收起侧栏' : '展开侧栏'}
        aria-expanded={sidebarOpen}
        aria-controls="workspace-sidebar"
        onClick={onToggleSidebar}
      />
      <div
        className="dataset-tabs mac:[-webkit-app-region:no-drag] flex flex-initial min-w-0 overflow-x-auto [scrollbar-width:none] gap-0.5 [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="工作标签"
        ref={list}
      >
        {tabs.map((dataset, index) => (
          <div
            key={dataset.id}
            className="flex items-center flex-none max-w-60 h-8 border border-transparent border-b-line rounded-[8px_8px_0_0] bg-transparent text-muted hover:text-ink hover:bg-[color-mix(in_srgb,_var(--accent)_4%,_transparent)] data-[selected=true]:text-ink data-[selected=true]:border-line data-[selected=true]:border-b-surface data-[selected=true]:bg-surface"
            data-selected={selectedId === dataset.id}
          >
            <button
              className="flex items-center gap-1.5 min-w-0 h-full py-0 px-2.5 border-0 bg-transparent text-inherit text-helper focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-accent focus-visible:-outline-offset-3"
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
              <DatabaseIcon className="shrink-0 size-3.5" />
              <span className="truncate">{dataset.name}</span>
            </button>
            <button
              type="button"
              className="grid place-items-center shrink-0 w-5 h-5 mr-1.5 p-[3px] border-0 rounded-[4px] bg-transparent text-muted hover:text-ink hover:bg-[color-mix(in_srgb,_var(--text)_8%,_transparent)] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-accent focus-visible:-outline-offset-3"
              aria-label={`关闭标签：${dataset.name}`}
              title="关闭标签"
              onClick={() => onClose(dataset.id)}
            >
              <XIcon className="shrink-0 size-3" />
            </button>
          </div>
        ))}
      </div>
      <Button
        variant="ghost"
        size="small"
        icon={<PlusIcon />}
        aria-label="打开数据标签"
        title="打开数据标签"
        onClick={() => setPickerOpen(true)}
      />
      {pickerOpen && (
        <DatasetPickerDialog
          datasets={datasets}
          onSelect={onOpenData}
          onClose={() => setPickerOpen(false)}
          onAddData={onAddData}
        />
      )}
    </div>
  );
}
