import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

type Options = {
  width: number;
  minWidth: number;
  maxWidth: number;
  collapseAt: 'min' | 'max';
  onStart: () => void;
  onResize: (width: number) => void;
  onCollapse: () => void;
};

type PointerDrag = {
  pointerId: number;
  startX: number;
  onMove: (offset: number) => void;
  onRelease: (offset: number | null) => void;
  onCancel: () => void;
};

export function clampPanelWidth(width: number, minWidth: number, maxWidth: number) {
  return Math.min(maxWidth, Math.max(minWidth, width));
}

function trackPointerDrag({ pointerId, startX, onMove, onRelease, onCancel }: PointerDrag) {
  let moved = false;

  const move = (event: PointerEvent) => {
    const offset = event.clientX - startX;
    if (event.pointerId !== pointerId || (!moved && offset === 0)) return;

    moved = true;
    onMove(offset);
  };

  const release = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;

    const offset = event.clientX - startX;
    onRelease(moved || offset !== 0 ? offset : null);
  };

  const cancel = (event: PointerEvent) => {
    if (event.pointerId === pointerId) onCancel();
  };

  window.addEventListener('pointermove', move, true);
  window.addEventListener('pointerup', release, true);
  window.addEventListener('pointercancel', cancel, true);
  window.addEventListener('blur', onCancel);
  return () => {
    window.removeEventListener('pointermove', move, true);
    window.removeEventListener('pointerup', release, true);
    window.removeEventListener('pointercancel', cancel, true);
    window.removeEventListener('blur', onCancel);
  };
}

export function usePanelResize({
  width,
  minWidth,
  maxWidth,
  collapseAt,
  onStart,
  onResize,
  onCollapse,
}: Options) {
  const [preview, setPreview] = useState<{ width: number; collapsePending: boolean } | null>(null);
  const detach = useRef<(() => void) | null>(null);

  const cancelResize = () => {
    detach.current?.();
    detach.current = null;
    setPreview(null);
  };

  useEffect(() => () => detach.current?.(), []);

  const resizeTo = (width: number) => {
    cancelResize();
    onResize(clampPanelWidth(width, minWidth, maxWidth));
  };

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || detach.current) return;

    const { clientX: startX, pointerId } = event;
    // Start from the visible width when grabbing a divider during a transition.
    const startWidth = event.currentTarget.previousElementSibling?.getBoundingClientRect().width ?? width;

    const measure = (offset: number) => {
      const requested = startWidth + offset;
      return {
        width: clampPanelWidth(requested, minWidth, maxWidth),
        collapsePending: collapseAt === 'min' ? requested <= minWidth : requested >= maxWidth,
      };
    };

    const commit = (offset: number | null) => {
      cancelResize();
      if (offset === null) return;

      const next = measure(offset);
      if (next.collapsePending) onCollapse();
      else onResize(next.width);
    };

    onStart();
    setPreview({ width: startWidth, collapsePending: false });
    detach.current = trackPointerDrag({
      pointerId,
      startX,
      onMove: (offset) => setPreview(measure(offset)),
      onRelease: commit,
      onCancel: cancelResize,
    });
    event.currentTarget.setPointerCapture(pointerId);
    event.preventDefault();
  };

  return {
    width: preview?.width ?? width,
    dragging: preview !== null,
    collapsePending: preview?.collapsePending ?? false,
    startResize,
    cancelResize,
    resizeTo,
  };
}
