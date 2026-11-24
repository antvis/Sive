import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import type { PanelImperativeHandle, PanelSize } from 'react-resizable-panels';

export function usePanelCollapsePreview(
  panel: RefObject<PanelImperativeHandle | null>,
  minWidth: number,
  onCollapse: () => void,
) {
  const elementRef = useRef<HTMLDivElement>(null);
  const separatorRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ controller: AbortController; moved: boolean } | null>(null);

  useEffect(() => () => drag.current?.controller.abort(), []);

  const reachedMinimum = (width = panel.current?.getSize().inPixels) =>
    Boolean(drag.current?.moved && width !== undefined && width <= minWidth);

  const updatePreview = (width?: number) => {
    elementRef.current?.toggleAttribute('data-collapse-preview', reachedMinimum(width));
  };

  const shouldCollapse = () =>
    Boolean(elementRef.current?.hasAttribute('data-collapse-preview') || reachedMinimum());

  const clear = () => {
    drag.current?.controller.abort();
    drag.current = null;
    updatePreview();
  };

  const onPointerDownCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0 || separatorRef.current?.dataset.separator !== 'active')
      return;

    clear();
    const { ownerDocument } = event.currentTarget;
    const { clientX, pointerId } = event;
    const interaction = { controller: new AbortController(), moved: false };
    drag.current = interaction;
    const { signal } = interaction.controller;

    ownerDocument.addEventListener(
      'pointermove',
      (pointer) => {
        if (pointer.pointerId !== pointerId) return;
        interaction.moved ||= pointer.clientX !== clientX;
        updatePreview();
      },
      { signal },
    );

    ownerDocument.addEventListener(
      'pointerup',
      (pointer) => {
        if (pointer.pointerId !== pointerId) return;
        const collapse = shouldCollapse();
        clear();
        if (collapse) onCollapse();
      },
      { capture: true, signal },
    );

    ownerDocument.addEventListener(
      'pointercancel',
      (pointer) => {
        if (pointer.pointerId === pointerId) clear();
      },
      { capture: true, signal },
    );

    ownerDocument.defaultView?.addEventListener('blur', clear, { signal });
  };

  return {
    elementRef,
    separatorRef,
    onPointerDownCapture,
    onResize: ({ inPixels }: PanelSize) => updatePreview(inPixels),
    shouldCollapse,
  };
}
