import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Group, Panel, Separator, usePanelRef } from 'react-resizable-panels';
import { DotsSixVerticalIcon } from '@phosphor-icons/react';
import { cx } from '../shared/cx';

const widthKey = 'sive.sidebar-width.v1';
const defaultWidth = 210;
const minWidth = 120;
const maxWidth = 420;

export default function WorkspaceLayout({
  sidebar,
  children,
  sidebarOpen,
  onSidebarOpenChange,
}: {
  sidebar: ReactNode;
  children: ReactNode;
  sidebarOpen: boolean;
  onSidebarOpenChange: (open: boolean) => void;
}) {
  const panel = usePanelRef();
  const [initialWidth] = useState(() => {
    try {
      const width = Number(localStorage.getItem(widthKey));
      return Number.isFinite(width) && width >= minWidth && width <= maxWidth ? width : defaultWidth;
    } catch {
      return defaultWidth;
    }
  });
  const lastWidth = useRef(initialWidth);
  useLayoutEffect(() => {
    if (sidebarOpen) panel.current?.resize(lastWidth.current);
    else panel.current?.collapse();
  }, [sidebarOpen, panel]);
  return (
    <Group
      orientation="horizontal"
      // Group supplies inline height: 100%; the workspace must stay bounded to the viewport.
      className="h-dvh! min-h-0 overflow-hidden [&:has(>_[data-separator=active])]:cursor-col-resize [&:has(>_[data-separator=active])]:select-none [&:has(>_[data-separator=active])_iframe]:pointer-events-none"
      onLayoutChanged={() => {
        const width = panel.current?.getSize().inPixels;
        if (!sidebarOpen || !width || width < minWidth) return;
        lastWidth.current = width;
        try {
          localStorage.setItem(widthKey, String(Math.min(maxWidth, width)));
        } catch {
          // Resizing remains available when local preferences cannot be persisted.
        }
      }}
    >
      <Panel
        id="workspace-menu"
        panelRef={panel}
        defaultSize={sidebarOpen ? initialWidth : 0}
        minSize={minWidth}
        maxSize={maxWidth}
        collapsible
        collapsedSize={0}
        groupResizeBehavior="preserve-pixel-size"
        className="h-full min-h-0 min-w-0 overflow-hidden"
        onResize={(size, _id, previous) => {
          if (previous && (size.inPixels === 0) !== (previous.inPixels === 0)) {
            onSidebarOpenChange(size.inPixels > 0);
          }
        }}
      >
        {sidebar}
      </Panel>
      <Separator
        className={cx(
          'group/divider flex items-center justify-center w-2.5 cursor-col-resize touch-none outline-none',
          !sidebarOpen && 'w-0 invisible',
        )}
        disabled={!sidebarOpen}
        inert={!sidebarOpen}
        aria-hidden={!sidebarOpen}
        aria-label="调整左侧菜单宽度"
        title="拖动调整菜单宽度，双击恢复默认"
        onDoubleClick={() => panel.current?.resize(defaultWidth)}
      >
        <span
          aria-hidden="true"
          className="flex h-6 w-3 shrink-0 pointer-events-none items-center justify-center rounded-sm text-muted opacity-0 transition-[color,opacity] group-hover/divider:text-accent group-hover/divider:opacity-100 group-focus-visible/divider:text-accent group-focus-visible/divider:opacity-100 group-focus-visible/divider:ring-2 group-focus-visible/divider:ring-accent/30 group-data-[separator=active]/divider:text-accent group-data-[separator=active]/divider:opacity-100 motion-reduce:transition-none"
        >
          <DotsSixVerticalIcon size={14} weight="bold" />
        </span>
      </Separator>
      <Panel id="workspace-content" minSize="50%" className="min-h-0 min-w-0 h-full [&>main]:h-full">
        {children}
      </Panel>
    </Group>
  );
}
