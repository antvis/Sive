import { useContext, useEffect, useRef } from 'react';
import { ThemeContext } from '../../theme';

const GLOW_RADIUS = 182;
const GLOW_IDLE_DELAY = 120;
const GLOW_FADE_DURATION = 320;
const RIPPLE_DURATION = 560;

type Point = { x: number; y: number };
type Glow = Point & { fadeAt: number };
type Ripple = Point & { startedAt: number };

export function DraftBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { mode } = useContext(ThemeContext);

  useEffect(() => {
    const canvas = canvasRef.current;
    const draft = canvas?.parentElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !draft || !context) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const dark = mode === 'dark';
    let frame = 0;
    let width = 0;
    let height = 0;
    let glow: Glow | undefined;
    let ripples: Ripple[] = [];

    const draw = (now: number) => {
      frame = 0;
      context.clearRect(0, 0, width, height);

      if (glow) {
        const { x, y, fadeAt } = glow;
        const opacity = 1 - Math.max(0, now - fadeAt) / GLOW_FADE_DURATION;
        if (opacity > 0) {
          const gradient = context.createRadialGradient(x, y, 0, x, y, GLOW_RADIUS);
          gradient.addColorStop(0, dark ? '#7ac8ff32' : '#1ca9f52b');
          gradient.addColorStop(0.42, dark ? '#55adff15' : '#52c4ff15');
          gradient.addColorStop(1, '#52c4ff00');
          context.globalAlpha = opacity ** 2;
          context.fillStyle = gradient;
          context.fillRect(x - GLOW_RADIUS, y - GLOW_RADIUS, GLOW_RADIUS * 2, GLOW_RADIUS * 2);
        } else {
          glow = undefined;
        }
      }

      ripples = ripples.filter(({ startedAt }) => now - startedAt < RIPPLE_DURATION);
      for (const { x, y, startedAt } of ripples) {
        const progress = Math.max(0, now - startedAt) / RIPPLE_DURATION;
        const radius = 12 + 105 * (1 - (1 - progress) ** 2);

        context.globalAlpha = 0.48 * (1 - progress) ** 1.6;
        context.strokeStyle = dark ? '#b6e3ff' : '#1697e3';
        context.lineWidth = 1.6 - progress * 0.8;
        context.beginPath();
        context.arc(x, y, radius, 0, 2 * Math.PI);
        context.stroke();
      }

      context.globalAlpha = 1;
      if (glow || ripples.length) requestDraw();
    };

    function requestDraw() {
      if (!frame) frame = requestAnimationFrame(draw);
    }

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const scale = Math.min(window.devicePixelRatio, 2);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
      requestDraw();
    };

    const locate = (event: MouseEvent): Point => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    function move(event: PointerEvent) {
      if (reduceMotion.matches || event.pointerType === 'touch') return;
      glow = { ...locate(event), fadeAt: performance.now() + GLOW_IDLE_DELAY };
      requestDraw();
    }

    function click(event: MouseEvent) {
      if (reduceMotion.matches || event.detail === 0) return;
      if (ripples.length === 4) ripples.shift();
      ripples.push({ ...locate(event), startedAt: performance.now() });
      requestDraw();
    }

    function leave() {
      if (glow) glow.fadeAt = Math.min(glow.fadeAt, performance.now());
    }

    function reset() {
      glow = undefined;
      ripples = [];
      requestDraw();
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    draft.addEventListener('pointermove', move, { passive: true });
    draft.addEventListener('click', click, { capture: true, passive: true });
    draft.addEventListener('pointerleave', leave, { passive: true });
    reduceMotion.addEventListener('change', reset);
    window.addEventListener('blur', reset);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      draft.removeEventListener('pointermove', move);
      draft.removeEventListener('click', click, true);
      draft.removeEventListener('pointerleave', leave);
      reduceMotion.removeEventListener('change', reset);
      window.removeEventListener('blur', reset);
    };
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      data-draft-background
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 block size-full"
    />
  );
}
