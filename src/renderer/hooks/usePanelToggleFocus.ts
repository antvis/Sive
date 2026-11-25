import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

export function usePanelToggleFocus(
  container: RefObject<HTMLElement | null>,
  panelId: string,
  collapsed: boolean,
) {
  const shouldRestore = useRef(false);

  useLayoutEffect(() => {
    if (!shouldRestore.current) return;

    shouldRestore.current = false;
    container.current
      ?.querySelector<HTMLButtonElement>(`button[aria-controls="${panelId}"][aria-expanded="${!collapsed}"]`)
      ?.focus({ preventScroll: true });
  }, [collapsed, container, panelId]);

  return (restoreFocus = false) => {
    shouldRestore.current = restoreFocus || document.activeElement?.getAttribute('aria-controls') === panelId;
  };
}
