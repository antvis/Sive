import { useLayoutEffect, useRef } from 'react';
import { panelAnimationTiming, prefersReducedMotion } from '../../hooks/usePanelMotion';

export function useFullscreenPreview(fullscreen: boolean, onFullscreenChange: (fullscreen: boolean) => void) {
  const card = useRef<HTMLElement>(null);
  const previousBounds = useRef<DOMRect | null>(null);

  useLayoutEffect(() => {
    const element = card.current;
    const from = previousBounds.current;
    previousBounds.current = null;
    if (!element || !from) return;

    const to = element.getBoundingClientRect();
    const rightOffset = from.right - to.right;
    const topOffset = from.top - to.top;
    const animation = element.animate(
      [
        {
          width: `${from.width}px`,
          height: `${from.height}px`,
          transform: `translate(${rightOffset}px, ${topOffset}px)`,
        },
        { width: '100%', height: '100%', transform: 'translate(0px, 0px)' },
      ],
      panelAnimationTiming,
    );
    return () => animation.cancel();
  }, [fullscreen]);

  const changeFullscreen = (value: boolean) => {
    previousBounds.current = prefersReducedMotion() ? null : (card.current?.getBoundingClientRect() ?? null);
    onFullscreenChange(value);
  };

  return { card, changeFullscreen };
}
