import { useI18n } from '../../i18n';
import clsx from 'clsx';
import { XIcon } from 'lucide-react';
import { Tabs } from 'radix-ui';
import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from './button';

const tabScrollOptions = { block: 'nearest', inline: 'nearest', container: 'nearest' } as const;

type PanelTab = {
  id: string;
  title: string;
  icon?: ReactNode;
};

type Props = {
  label: string;
  tabs: readonly PanelTab[];
  activeTabId: string;
  visible: boolean;
  className?: string;
  onClose: (id: string) => void;
};

export function PanelTabList({ label, tabs, activeTabId, visible, className, onClose }: Props) {
  const i18n = useI18n();
  const activeTab = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  useLayoutEffect(() => {
    if (!visible || !activeTab.current) return;
    activeTab.current.parentElement?.scrollIntoView(tabScrollOptions);
    if (restoreFocus.current) {
      restoreFocus.current = false;
      activeTab.current.focus({ preventScroll: true });
    }
  }, [activeTabId, tabs.length, visible]);

  const closeTab = (id: string) => {
    restoreFocus.current = tabs.length > 1;
    onClose(id);
  };

  return (
    <Tabs.List aria-label={label} className={clsx('flex min-w-0 items-center', className)}>
      <div className="flex min-w-0 items-center gap-1 overflow-x-auto scrollbar-none [-webkit-app-region:no-drag]">
        {tabs.map(({ id, title, icon }) => (
          <div
            key={id}
            className={clsx(
              'flex max-w-[min(100%,176px)] shrink-0 items-center rounded-md',
              activeTabId === id && 'bg-selected',
            )}
          >
            <Tabs.Trigger
              ref={activeTabId === id ? activeTab : undefined}
              value={id}
              title={title}
              className="flex h-[28px] min-w-0 items-center gap-1.5 rounded-md ps-2 pe-1 text-sm text-muted-foreground -outline-offset-1 hover:text-ink data-[state=active]:font-medium data-[state=active]:text-selected-foreground"
              aria-keyshortcuts="Delete"
              onKeyDown={(event) => {
                if (event.key !== 'Delete') return;
                event.preventDefault();
                closeTab(id);
              }}
            >
              {icon}
              <span className="truncate">{title}</span>
            </Tabs.Trigger>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={i18n("sidePanel.tabs.closeLabel", [title])}
              title={i18n("sidePanel.tabs.closeLabel", [title])}
              tabIndex={-1}
              className="me-1 hover:bg-ink/5"
              onClick={() => closeTab(id)}
            >
              <XIcon className="size-[12px]" aria-hidden />
            </Button>
          </div>
        ))}
      </div>
    </Tabs.List>
  );
}
