import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Group, Panel, Separator, usePanelRef } from 'react-resizable-panels';
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
      className="h-dvh! min-h-0 overflow-hidden [&:has(>_[data-separator=active])_iframe]:pointer-events-none"
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
          'w-1.5 cursor-col-resize touch-none bg-page border-r border-line hover:border-r-[color-mix(in_srgb,_var(--muted)_55%,_var(--border))] hover:outline-none focus-visible:border-r-[color-mix(in_srgb,_var(--muted)_55%,_var(--border))] focus-visible:outline-none data-[separator=active]:border-r-[color-mix(in_srgb,_var(--muted)_55%,_var(--border))] data-[separator=active]:outline-none',
          !sidebarOpen && 'w-0 border-r-0 invisible',
        )}
        disabled={!sidebarOpen}
        inert={!sidebarOpen}
        aria-hidden={!sidebarOpen}
        aria-label="调整左侧菜单宽度"
        title="拖动调整菜单宽度，双击恢复默认"
        onDoubleClick={() => panel.current?.resize(defaultWidth)}
      />
      <Panel id="workspace-content" minSize="50%" className="min-h-0 min-w-0 h-full [&>main]:h-full">
        {children}
      </Panel>
    </Group>
  );
}
