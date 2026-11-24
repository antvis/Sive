import { useEffect, useRef } from 'react';

export const panelAnimationTiming = { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' };

export const panelMotionClassName =
  'motion-safe:data-[settling]:transition-[grid-template-columns] motion-safe:data-[settling]:duration-[320ms] motion-safe:data-[settling]:ease-[cubic-bezier(.22,1,.36,1)]';

export const panelContentTiming = 'motion-safe:duration-[320ms] motion-safe:ease-[cubic-bezier(.22,1,.36,1)]';

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function usePanelMotion() {
  const element = useRef<HTMLDivElement>(null);
  const settling = useRef<number | null>(null);

  const stopMotion = () => {
    if (settling.current !== null) window.clearTimeout(settling.current);
    settling.current = null;
    if (element.current) delete element.current.dataset.settling;
  };

  const startMotion = () => {
    if (!element.current || prefersReducedMotion()) return;

    if (settling.current !== null) window.clearTimeout(settling.current);
    element.current.dataset.settling = '';
    settling.current = window.setTimeout(stopMotion, panelAnimationTiming.duration + 32);
  };

  useEffect(
    () => () => {
      if (settling.current !== null) window.clearTimeout(settling.current);
    },
    [],
  );

  return { element, startMotion, stopMotion };
}
