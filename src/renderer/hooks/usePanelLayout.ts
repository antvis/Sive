import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { usePanelRef } from 'react-resizable-panels';
import type { PanelSize } from 'react-resizable-panels';
import { readWidth, saveWidth } from '../utils';

export function usePanelLayout(key: string, fallback: number) {
  const panelRef = usePanelRef();
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const [transitioning, setTransitioning] = useState(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(transitionTimer.current), []);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(`${key}.collapsed`) === 'true';
    } catch {
      return false;
    }
  });
  const [defaultSize] = useState(() => (collapsed ? 0 : readWidth(key, fallback)));

  useLayoutEffect(() => {
    if (!restoreFocus.current) return;
    toggleButtonRef.current?.focus({ preventScroll: true });
    restoreFocus.current = false;
  }, [collapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(`${key}.collapsed`, String(collapsed));
    } catch {
      // Collapsing panels still works without persistence.
    }
  }, [key, collapsed]);

  const onResize = (size: PanelSize) => {
    if (transitionTimer.current !== undefined) return;
    const hidden = size.inPixels === 0;
    setCollapsed(hidden);
    if (!hidden) saveWidth(key, size.inPixels);
  };

  const finishTransition = () => {
    if (transitionTimer.current === undefined) return;
    clearTimeout(transitionTimer.current);
    // Commit the final layout before reading the library's rendered pixel size.
    flushSync(() => setTransitioning(false));
    transitionTimer.current = undefined;
    if (panelRef.current) onResize(panelRef.current.getSize());
  };

  return {
    panelRef,
    toggleButtonRef,
    collapsed,
    defaultSize,
    onResize,
    transitionClassName: transitioning ? 'panel-transition' : undefined,
    finishTransition,
    toggle: (event: MouseEvent<HTMLButtonElement>) => {
      const panel = panelRef.current;
      if (!panel) return;
      restoreFocus.current = event.detail === 0;
      clearTimeout(transitionTimer.current);
      setTransitioning(true);
      transitionTimer.current = setTimeout(finishTransition, 220);
      if (panel.isCollapsed()) {
        panel.resize(readWidth(key, fallback));
        // Recover widths saved by an interrupted transition below the current minimum.
        if (panel.isCollapsed()) panel.expand();
      } else panel.collapse();
      setCollapsed(panel.isCollapsed());
    },
  };
}
